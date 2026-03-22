import { sha256, merkleRoot } from "./crypto";
import { collectFingerprint } from "./fingerprint";
import { BehaviorCollector } from "./behavior";
import { detectAutomation } from "./detection";
import type {
  JanusConfig,
  VerifyResult,
  PowChallenge,
  PowResult,
  FingerprintResult,
  BehaviorResult,
  DetectionResult,
  VerifyPayload,
} from "./types";

// ── Inline worker source ───────────────────────────────────────────
// The PoW worker is inlined as a blob URL so the SDK remains a single file
// with no external worker script to host.

const POW_WORKER_SOURCE = `
const ctx = self;

async function sha256Hex(data) {
  const encoded = new TextEncoder().encode(data);
  const buffer = await crypto.subtle.digest("SHA-256", encoded);
  const bytes = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function hasLeadingZeros(hash, difficulty) {
  for (let i = 0; i < difficulty; i++) {
    if (hash[i] !== "0") return false;
  }
  return true;
}

ctx.addEventListener("message", async (e) => {
  const { challenge, difficulty, signalRoot } = e.data;
  const start = performance.now();
  let nonce = 0;

  while (true) {
    const input = challenge + nonce.toString();
    const hash = await sha256Hex(input);

    if (hasLeadingZeros(hash, difficulty)) {
      const timeMs = Math.round(performance.now() - start);
      ctx.postMessage({ nonce, hash, iterations: nonce + 1, timeMs });
      return;
    }

    nonce++;
    if (nonce % 1000 === 0) {
      await new Promise((r) => setTimeout(r, 0));
    }
  }
});
`;

// ── Helpers ────────────────────────────────────────────────────────

function createWorkerBlob(): Worker {
  const blob = new Blob([POW_WORKER_SOURCE], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url);
  // Revoke after the worker has started
  URL.revokeObjectURL(url);
  return worker;
}

async function computeSignalRoot(
  fingerprint: FingerprintResult,
  behavior: BehaviorResult,
  detection: DetectionResult,
): Promise<string> {
  const leaves = [
    await sha256(fingerprint.hash),
    await sha256(JSON.stringify(behavior)),
    await sha256(JSON.stringify(detection)),
  ];
  return merkleRoot(leaves);
}

// ── Janus Class ────────────────────────────────────────────────────

export class Janus {
  private readonly config: JanusConfig;
  private behaviorCollector: BehaviorCollector;

  constructor(config: JanusConfig) {
    this.config = config;
    this.behaviorCollector = new BehaviorCollector();

    // In managed mode behaviour is collected starting from construction.
    // In invisible mode it starts on execute().
    if (config.mode === "managed") {
      this.behaviorCollector.start();
    }
  }

  /**
   * Execute the full verification flow:
   *  1. Request a PoW challenge from the server
   *  2. Collect fingerprint, behaviour & automation signals
   *  3. Solve PoW in a Web Worker
   *  4. Submit all data to /api/v1/verify
   *  5. Return the verification result
   */
  async execute(): Promise<VerifyResult> {
    if (this.config.mode === "invisible") {
      this.behaviorCollector.start();
    }

    // Step 1 — request challenge & collect signals in parallel
    const [challenge, fingerprint, detection] = await Promise.all([
      this.requestChallenge(),
      collectFingerprint(),
      Promise.resolve(detectAutomation()),
    ]);

    // Use server-returned mode if available, fall back to constructor config
    const effectiveMode = challenge.mode || this.config.mode;

    // Give a brief window for behaviour collection in invisible mode
    if (effectiveMode === "invisible") {
      await new Promise((r) => setTimeout(r, 150));
    } else if (effectiveMode === "managed") {
      // Managed mode: longer collection window since user is interacting
      await new Promise((r) => setTimeout(r, 500));
    }

    this.behaviorCollector.stop();
    const behavior = this.behaviorCollector.summarize();

    // Step 2 — compute signal root for PoW binding
    const signalRoot = await computeSignalRoot(fingerprint, behavior, detection);

    // Step 3 — solve PoW
    const pow = await this.solvePoW(challenge, signalRoot);

    // Step 4 — submit
    const result = await this.submitVerification({
      siteKey: this.config.siteKey,
      pow: { ...pow, challengeId: challenge.challengeId },
      fingerprint,
      behavior,
      detection,
      signalRoot,
      timestamp: Date.now(),
    });

    return result;
  }

  /**
   * Render a managed-mode checkbox widget into the given container.
   */
  render(containerId: string): void {
    const container = document.getElementById(containerId);
    if (!container) {
      throw new Error(`[Janus] Container element #${containerId} not found`);
    }

    // Build widget DOM
    const wrapper = document.createElement("div");
    wrapper.className = "janus-widget";
    wrapper.style.cssText =
      "display:inline-flex;align-items:center;gap:10px;padding:12px 16px;" +
      "border:1px solid #d0d0d0;border-radius:6px;background:#fafafa;" +
      "font-family:system-ui,-apple-system,sans-serif;font-size:14px;" +
      "user-select:none;cursor:pointer;transition:border-color .2s";

    const checkbox = document.createElement("div");
    checkbox.className = "janus-checkbox";
    checkbox.style.cssText =
      "width:24px;height:24px;border:2px solid #c0c0c0;border-radius:4px;" +
      "display:flex;align-items:center;justify-content:center;transition:all .3s;" +
      "background:#fff";

    const label = document.createElement("span");
    label.textContent = "I'm not a robot";

    const branding = document.createElement("span");
    branding.style.cssText =
      "margin-left:auto;font-size:10px;color:#999;display:flex;flex-direction:column;" +
      "align-items:flex-end;line-height:1.3";
    branding.innerHTML = "<strong style='font-size:11px;color:#555'>Janus</strong>Privacy & Terms";

    wrapper.appendChild(checkbox);
    wrapper.appendChild(label);
    wrapper.appendChild(branding);
    container.appendChild(wrapper);

    // Click handler
    let executing = false;
    wrapper.addEventListener("click", async () => {
      if (executing) return;
      executing = true;

      // Spinner state
      checkbox.style.borderColor = "#3b82f6";
      checkbox.innerHTML =
        '<div style="width:14px;height:14px;border:2px solid #3b82f6;' +
        'border-top-color:transparent;border-radius:50%;animation:janus-spin .6s linear infinite"></div>';

      // Inject keyframes if not already present
      if (!document.getElementById("janus-styles")) {
        const style = document.createElement("style");
        style.id = "janus-styles";
        style.textContent =
          "@keyframes janus-spin{to{transform:rotate(360deg)}}";
        document.head.appendChild(style);
      }

      try {
        const result = await this.execute();

        if (result.success) {
          checkbox.style.borderColor = "#22c55e";
          checkbox.style.background = "#22c55e";
          checkbox.innerHTML =
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
            '<path d="M3 8l3.5 3.5L13 5" stroke="#fff" stroke-width="2.5" ' +
            'stroke-linecap="round" stroke-linejoin="round"/></svg>';
          wrapper.style.borderColor = "#22c55e";
        } else {
          checkbox.style.borderColor = "#ef4444";
          checkbox.innerHTML =
            '<svg width="16" height="16" viewBox="0 0 16 16" fill="none">' +
            '<path d="M4 4l8 8M12 4l-8 8" stroke="#ef4444" stroke-width="2.5" ' +
            'stroke-linecap="round"/></svg>';
          wrapper.style.borderColor = "#ef4444";
          // Allow retry after a short delay
          setTimeout(() => {
            executing = false;
            checkbox.innerHTML = "";
            checkbox.style.borderColor = "#c0c0c0";
            checkbox.style.background = "#fff";
            wrapper.style.borderColor = "#d0d0d0";
          }, 2000);
        }
      } catch {
        checkbox.style.borderColor = "#ef4444";
        checkbox.innerHTML = "!";
        setTimeout(() => {
          executing = false;
          checkbox.innerHTML = "";
          checkbox.style.borderColor = "#c0c0c0";
          checkbox.style.background = "#fff";
          wrapper.style.borderColor = "#d0d0d0";
        }, 2000);
      }
    });
  }

  // ── Private Methods ────────────────────────────────────────────

  private async requestChallenge(): Promise<PowChallenge> {
    const url = `${this.config.apiUrl}/api/v1/challenge`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Site-Key": this.config.siteKey,
      },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(
        body.message || `[Janus] Challenge request failed: ${res.status}`
      );
    }

    return res.json() as Promise<PowChallenge>;
  }

  private solvePoW(
    challenge: PowChallenge,
    signalRoot: string,
  ): Promise<PowResult> {
    return new Promise((resolve, reject) => {
      const worker = createWorkerBlob();

      const timeout = setTimeout(() => {
        worker.terminate();
        reject(new Error("[Janus] PoW timed out"));
      }, 30_000);

      worker.addEventListener("message", (e: MessageEvent<PowResult>) => {
        clearTimeout(timeout);
        worker.terminate();
        resolve(e.data);
      });

      worker.addEventListener("error", (e) => {
        clearTimeout(timeout);
        worker.terminate();
        reject(new Error(`[Janus] PoW worker error: ${e.message}`));
      });

      worker.postMessage({
        challenge: challenge.challenge,
        difficulty: challenge.difficulty,
        signalRoot,
      });
    });
  }

  private async submitVerification(payload: VerifyPayload): Promise<VerifyResult> {
    const url = `${this.config.apiUrl}/api/v1/verify`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Site-Key": payload.siteKey,
      },
      body: JSON.stringify({
        challengeId: payload.pow.challengeId,
        nonce: String(payload.pow.nonce),
        solveTimeMs: payload.pow.timeMs,
        fingerprint: payload.fingerprint.components,
        behaviorData: payload.behavior,
      }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return {
        success: false,
        token: "",
        riskScore: -1,
        action: "block",
        error: body.message || `Verification failed: ${res.status}`,
      } as VerifyResult;
    }

    return res.json() as Promise<VerifyResult>;
  }
}
