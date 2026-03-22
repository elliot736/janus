import { sha256 } from "./crypto";
import type { FingerprintComponents, FingerprintResult } from "./types";

// ── Canvas ─────────────────────────────────────────────────────────

function getCanvasFingerprint(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";

    // Draw varied shapes to maximise renderer-dependent differences
    ctx.fillStyle = "#f0f0f0";
    ctx.fillRect(0, 0, 256, 128);

    ctx.fillStyle = "#ff6347";
    ctx.beginPath();
    ctx.arc(50, 50, 30, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(30, 144, 255, 0.7)";
    ctx.fillRect(80, 20, 90, 60);

    ctx.strokeStyle = "#2e8b57";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(10, 120);
    ctx.bezierCurveTo(50, 10, 150, 110, 240, 30);
    ctx.stroke();

    ctx.font = "16px Arial";
    ctx.fillStyle = "#333";
    ctx.fillText("Janus\u2603\uD83D\uDE00", 100, 100);

    return canvas.toDataURL();
  } catch {
    return "";
  }
}

// ── WebGL ──────────────────────────────────────────────────────────

function getWebGLInfo(): { vendor: string; renderer: string } {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl || !(gl instanceof WebGLRenderingContext)) {
      return { vendor: "", renderer: "" };
    }
    const ext = gl.getExtension("WEBGL_debug_renderer_info");
    if (!ext) {
      return {
        vendor: gl.getParameter(gl.VENDOR) ?? "",
        renderer: gl.getParameter(gl.RENDERER) ?? "",
      };
    }
    return {
      vendor: gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) ?? "",
      renderer: gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) ?? "",
    };
  } catch {
    return { vendor: "", renderer: "" };
  }
}

// ── Audio ──────────────────────────────────────────────────────────

async function getAudioFingerprint(): Promise<string> {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return "";

    const ctx = new AudioCtx();
    const oscillator = ctx.createOscillator();
    const analyser = ctx.createAnalyser();
    const gain = ctx.createGain();
    const compressor = ctx.createDynamicsCompressor();

    oscillator.type = "triangle";
    oscillator.frequency.setValueAtTime(10000, ctx.currentTime);

    gain.gain.setValueAtTime(0, ctx.currentTime);

    oscillator.connect(compressor);
    compressor.connect(analyser);
    analyser.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(0);

    // Allow a short render
    await new Promise((r) => setTimeout(r, 50));

    const data = new Float32Array(analyser.frequencyBinCount);
    analyser.getFloatFrequencyData(data);

    oscillator.stop();
    await ctx.close();

    // Build a string from the frequency data
    let result = "";
    for (let i = 0; i < data.length; i++) {
      result += data[i].toFixed(2);
    }
    return result;
  } catch {
    return "";
  }
}

// ── Fonts ──────────────────────────────────────────────────────────

function getInstalledFonts(): string[] {
  const testFonts = [
    "Arial",
    "Courier New",
    "Georgia",
    "Times New Roman",
    "Verdana",
    "Trebuchet MS",
    "Palatino",
    "Garamond",
    "Comic Sans MS",
    "Impact",
    "Lucida Console",
    "Tahoma",
    "Helvetica",
    "Futura",
    "Calibri",
    "Cambria",
    "Consolas",
    "Monaco",
    "Menlo",
    "Ubuntu",
  ];

  const baseFonts = ["monospace", "sans-serif", "serif"] as const;
  const testString = "mmmmmmmmmmlli";
  const testSize = "72px";

  const span = document.createElement("span");
  span.style.position = "absolute";
  span.style.left = "-9999px";
  span.style.top = "-9999px";
  span.style.fontSize = testSize;
  span.style.lineHeight = "normal";
  span.textContent = testString;
  document.body.appendChild(span);

  // Measure base widths
  const baseWidths: Record<string, number> = {};
  for (const base of baseFonts) {
    span.style.fontFamily = base;
    baseWidths[base] = span.offsetWidth;
  }

  const detected: string[] = [];

  for (const font of testFonts) {
    let found = false;
    for (const base of baseFonts) {
      span.style.fontFamily = `"${font}", ${base}`;
      if (span.offsetWidth !== baseWidths[base]) {
        found = true;
        break;
      }
    }
    if (found) {
      detected.push(font);
    }
  }

  document.body.removeChild(span);
  return detected;
}

// ── Navigator / Screen ─────────────────────────────────────────────

function getNavigatorProps(): Pick<
  FingerprintComponents,
  | "platform"
  | "hardwareConcurrency"
  | "deviceMemory"
  | "languages"
  | "maxTouchPoints"
> {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    platform: nav.platform ?? "",
    hardwareConcurrency: nav.hardwareConcurrency ?? 0,
    deviceMemory: nav.deviceMemory,
    languages: nav.languages ?? [],
    maxTouchPoints: nav.maxTouchPoints ?? 0,
  };
}

function getScreenProps(): Pick<
  FingerprintComponents,
  "screenWidth" | "screenHeight" | "colorDepth" | "pixelRatio"
> {
  return {
    screenWidth: screen.width,
    screenHeight: screen.height,
    colorDepth: screen.colorDepth,
    pixelRatio: window.devicePixelRatio ?? 1,
  };
}

// ── Entropy estimation ─────────────────────────────────────────────

function estimateEntropy(components: FingerprintComponents): number {
  let bits = 0;
  if (components.canvas) bits += 10;
  if (components.webglRenderer) bits += 8;
  if (components.audio) bits += 6;
  bits += Math.min(components.fonts.length * 0.5, 8);
  bits += Math.log2(Math.max(components.hardwareConcurrency, 1));
  bits += Math.log2(Math.max(components.screenWidth * components.screenHeight, 1));
  if (components.languages.length > 1) bits += 3;
  if (components.maxTouchPoints > 0) bits += 2;
  return Math.round(bits * 100) / 100;
}

// ── Public API ─────────────────────────────────────────────────────

export async function collectFingerprint(): Promise<FingerprintResult> {
  const canvasRaw = getCanvasFingerprint();
  const webgl = getWebGLInfo();
  const audioRaw = await getAudioFingerprint();
  const fonts = getInstalledFonts();
  const navProps = getNavigatorProps();
  const screenProps = getScreenProps();

  const canvasHash = canvasRaw ? await sha256(canvasRaw) : "";
  const audioHash = audioRaw ? await sha256(audioRaw) : "";

  const components: FingerprintComponents = {
    canvas: canvasHash,
    webglVendor: webgl.vendor,
    webglRenderer: webgl.renderer,
    audio: audioHash,
    fonts,
    ...navProps,
    ...screenProps,
  };

  // Combine all signals into a single hash
  const combined = [
    components.canvas,
    components.webglVendor,
    components.webglRenderer,
    components.audio,
    components.fonts.join(","),
    components.platform,
    String(components.hardwareConcurrency),
    String(components.deviceMemory ?? ""),
    Array.from(components.languages).join(","),
    String(components.maxTouchPoints),
    String(components.screenWidth),
    String(components.screenHeight),
    String(components.colorDepth),
    String(components.pixelRatio),
  ].join("|");

  const hash = await sha256(combined);
  const entropy = estimateEntropy(components);

  return { hash, entropy, components };
}
