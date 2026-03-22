// ── SDK Configuration ──────────────────────────────────────────────

export type JanusMode = "invisible" | "managed";

export interface RetryConfig {
  /** Maximum number of retry attempts (default: 2) */
  maxRetries?: number;
  /** Base delay in ms for exponential backoff (default: 500) */
  baseDelayMs?: number;
}

export interface JanusConfig {
  /** The site key issued from the Janus dashboard */
  siteKey: string;
  /** Base URL of the Janus API server */
  apiUrl: string;
  /** Operation mode */
  mode: JanusMode;
  /** Retry configuration for network failures */
  retry?: RetryConfig;
}

// ── Verification Result ────────────────────────────────────────────

export interface VerifyResult {
  success: boolean;
  token: string;
  riskScore: number;
  action: string;
}

// ── Proof-of-Work ──────────────────────────────────────────────────

export interface PowChallenge {
  challengeId: string;
  challenge: string;
  difficulty: number;
  mode?: "invisible" | "managed";
  gdprMode?: boolean;
}

export interface PowRequest {
  challenge: string;
  difficulty: number;
  signalRoot: string;
}

export interface PowResult {
  nonce: number;
  hash: string;
  iterations: number;
  timeMs: number;
}

// ── Fingerprint ────────────────────────────────────────────────────

export interface FingerprintComponents {
  canvas: string;
  webglVendor: string;
  webglRenderer: string;
  audio: string;
  fonts: string[];
  platform: string;
  hardwareConcurrency: number;
  deviceMemory: number | undefined;
  languages: readonly string[];
  maxTouchPoints: number;
  screenWidth: number;
  screenHeight: number;
  colorDepth: number;
  pixelRatio: number;
}

export interface FingerprintResult {
  hash: string;
  entropy: number;
  components: FingerprintComponents;
}

// ── Behavior ───────────────────────────────────────────────────────

export interface MouseSample {
  x: number;
  y: number;
  t: number;
  velocity: number;
}

export interface KeySample {
  delta: number;
}

export interface BehaviorResult {
  totalEvents: number;
  mouseEvents: number;
  mouseCv: number;
  keyboardVariance: number;
  scrollEvents: number;
  touchEvents: number;
  hasSubPixel: boolean;
  durationMs: number;
}

// ── Automation Detection ───────────────────────────────────────────

export interface DetectionResult {
  webdriver: boolean;
  phantom: boolean;
  selenium: boolean;
  cdp: boolean;
  headless: boolean;
  markers: string[];
}

// ── Internal: Verification Payload ─────────────────────────────────

export interface VerifyPayload {
  siteKey: string;
  pow: PowResult & { challengeId: string };
  fingerprint: FingerprintResult;
  behavior: BehaviorResult;
  detection: DetectionResult;
  signalRoot: string;
  timestamp: number;
}
