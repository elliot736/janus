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
  RetryConfig,
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

function createSvgIcon(
  d: string,
  stroke: string,
  strokeWidth: string,
  linecap: string,
): SVGSVGElement {
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("width", "16");
  svg.setAttribute("height", "16");
  svg.setAttribute("viewBox", "0 0 16 16");
  svg.setAttribute("fill", "none");

  // d may contain multiple path definitions separated by 'M'
  const paths = d.split(/(?=M)/).filter(Boolean);
  for (const pathD of paths) {
    const path = document.createElementNS(ns, "path");
    path.setAttribute("d", pathD);
    path.setAttribute("stroke", stroke);
    path.setAttribute("stroke-width", strokeWidth);
    path.setAttribute("stroke-linecap", linecap);
    path.setAttribute("stroke-linejoin", linecap);
    svg.appendChild(path);
  }
  return svg;
}

// ── Retry Helper ──────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  retryConfig: RetryConfig,
): Promise<T> {
  const maxRetries = retryConfig.maxRetries ?? 2;
  const baseDelay = retryConfig.baseDelayMs ?? 500;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;

      // Don't retry on client errors (4xx)
      if (lastError.message.includes("400") || lastError.message.includes("403") || lastError.message.includes("404")) {
        throw lastError;
      }

      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  throw lastError;
}

// ── Janus Class ────────────────────────────────────────────────────

export class Janus {
  private readonly config: JanusConfig;
  private readonly retryConfig: RetryConfig;
  private behaviorCollector: BehaviorCollector;

  constructor(config: JanusConfig) {
    try {
      const url = new URL(config.apiUrl);
      if (url.protocol !== 'https:' && !url.hostname.match(/^(localhost|127\.0\.0\.1)$/)) {
        console.warn('[Janus] apiUrl should use HTTPS in production');
      }
    } catch {
      throw new Error('[Janus] Invalid apiUrl');
    }
    this.config = config;
    this.retryConfig = config.retry ?? {};
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
    // GDPR mode still collects all signals (they're hashed/aggregated, not personal data).
    // The server handles IP anonymization and data retention.
    const [challenge, fingerprint, detection] = await Promise.all([
      withRetry(() => this.requestChallenge(), this.retryConfig),
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

    // Step 4 — submit (with retry)
    const result = await withRetry(() => this.submitVerification({
      siteKey: this.config.siteKey,
      pow: { ...pow, challengeId: challenge.challengeId },
      fingerprint,
      behavior,
      detection,
      signalRoot,
      timestamp: Date.now(),
    }), this.retryConfig);

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
    const brandName = document.createElement("strong");
    brandName.style.cssText = "font-size:11px;color:#555";
    brandName.textContent = "Janus";
    branding.appendChild(brandName);
    branding.appendChild(document.createTextNode("Privacy & Terms"));

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
      checkbox.textContent = "";
      const spinner = document.createElement("div");
      spinner.style.cssText =
        "width:14px;height:14px;border:2px solid #3b82f6;" +
        "border-top-color:transparent;border-radius:50%;animation:janus-spin .6s linear infinite";
      checkbox.appendChild(spinner);

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
          checkbox.textContent = "";
          checkbox.appendChild(createSvgIcon(
            "M3 8l3.5 3.5L13 5", "#fff", "2.5", "round",
          ));
          wrapper.style.borderColor = "#22c55e";
        } else {
          checkbox.style.borderColor = "#ef4444";
          checkbox.textContent = "";
          checkbox.appendChild(createSvgIcon(
            "M4 4l8 8M12 4l-8 8", "#ef4444", "2.5", "round",
          ));
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
        checkbox.textContent = "!";
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
      const message = body.message || `Verification failed: ${res.status}`;
      // Throw on server errors so retry can catch them;
      // client errors (4xx) are not retryable
      if (res.status >= 500) {
        throw new Error(message);
      }
      return {
        success: false,
        token: "",
        riskScore: -1,
        action: "block",
        error: message,
      } as VerifyResult;
    }

    return res.json() as Promise<VerifyResult>;
  }
}
