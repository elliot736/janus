import type { BehaviorResult, MouseSample, KeySample } from "./types";

/**
 * BehaviorCollector passively records mouse, keyboard, scroll, and touch
 * events for the duration of a verification challenge. The summary is used
 * server-side to distinguish human users from automated agents.
 */
export class BehaviorCollector {
  private mouseSamples: MouseSample[] = [];
  private keySamples: KeySample[] = [];
  private scrollCount = 0;
  private touchCount = 0;
  private startTime = 0;
  private lastKeyDown = 0;
  private hasSubPixel = false;
  private bound = false;

  // Bound handlers (stored so we can remove them later)
  private onMouseMove = (e: MouseEvent): void => {
    const now = performance.now();
    const last = this.mouseSamples[this.mouseSamples.length - 1];
    let velocity = 0;

    if (last) {
      const dx = e.clientX - last.x;
      const dy = e.clientY - last.y;
      const dt = now - last.t;
      if (dt > 0) {
        velocity = Math.sqrt(dx * dx + dy * dy) / dt;
      }
    }

    // Detect sub-pixel positions (common in automated tools using floats)
    if (e.clientX % 1 !== 0 || e.clientY % 1 !== 0) {
      this.hasSubPixel = true;
    }

    this.mouseSamples.push({ x: e.clientX, y: e.clientY, t: now, velocity });
  };

  private onKeyDown = (): void => {
    const now = performance.now();
    if (this.lastKeyDown > 0) {
      this.keySamples.push({ delta: now - this.lastKeyDown });
    }
    this.lastKeyDown = now;
  };

  private onScroll = (): void => {
    this.scrollCount++;
  };

  private onTouch = (): void => {
    this.touchCount++;
  };

  /** Begin listening for user interaction events. */
  start(): void {
    if (this.bound) return;
    this.bound = true;
    this.startTime = performance.now();

    document.addEventListener("mousemove", this.onMouseMove, { passive: true });
    document.addEventListener("keydown", this.onKeyDown, { passive: true });
    window.addEventListener("scroll", this.onScroll, { passive: true });
    document.addEventListener("touchstart", this.onTouch, { passive: true });
  }

  /** Stop listening and clean up handlers. */
  stop(): void {
    if (!this.bound) return;
    this.bound = false;

    document.removeEventListener("mousemove", this.onMouseMove);
    document.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("scroll", this.onScroll);
    document.removeEventListener("touchstart", this.onTouch);
  }

  /** Return a summary of all collected behavioral signals. */
  summarize(): BehaviorResult {
    const durationMs = this.bound
      ? performance.now() - this.startTime
      : this.startTime > 0
        ? performance.now() - this.startTime
        : 0;

    return {
      totalEvents:
        this.mouseSamples.length +
        this.keySamples.length +
        this.scrollCount +
        this.touchCount,
      mouseEvents: this.mouseSamples.length,
      mouseCv: this.computeMouseCv(),
      keyboardVariance: this.computeKeyboardVariance(),
      scrollEvents: this.scrollCount,
      touchEvents: this.touchCount,
      hasSubPixel: this.hasSubPixel,
      durationMs: Math.round(durationMs),
    };
  }

  /**
   * Coefficient of variation of mouse velocity.
   * A very low CV may indicate robotic, constant-speed movement.
   */
  private computeMouseCv(): number {
    const velocities = this.mouseSamples
      .map((s) => s.velocity)
      .filter((v) => v > 0);

    if (velocities.length < 2) return 0;

    const mean = velocities.reduce((a, b) => a + b, 0) / velocities.length;
    if (mean === 0) return 0;

    const variance =
      velocities.reduce((sum, v) => sum + (v - mean) ** 2, 0) /
      velocities.length;

    return Math.sqrt(variance) / mean;
  }

  /**
   * Variance of keydown-to-keydown timing deltas (ms^2).
   * Near-zero variance is a strong bot indicator.
   */
  private computeKeyboardVariance(): number {
    if (this.keySamples.length < 2) return 0;

    const deltas = this.keySamples.map((s) => s.delta);
    const mean = deltas.reduce((a, b) => a + b, 0) / deltas.length;
    const variance =
      deltas.reduce((sum, d) => sum + (d - mean) ** 2, 0) / deltas.length;

    return Math.round(variance * 100) / 100;
  }
}
