import { Injectable } from '@nestjs/common';

interface ScoreParams {
  solveTimeMs?: number;
  behaviorData?: Record<string, unknown>;
  fingerprintConsistency: number;
  fingerprintAnomalies: string[];
  ipAddress: string;
  ja3Hash?: string | null;
  mode?: string;
  gdprMode?: boolean;
}

interface ScoreResult {
  score: number;
  behaviorScore?: number;
  anomalies: string[];
}

@Injectable()
export class RiskScoringService {
  /**
   * Heuristic risk scoring engine.
   * Base score: 50 (neutral). Lower = safer, higher = riskier.
   * Adjustments are additive/subtractive.
   */
  score(params: ScoreParams): ScoreResult {
    let score = 50;
    const anomalies: string[] = [...params.fingerprintAnomalies];
    let behaviorScore: number | undefined;

    // --- GDPR mode: only use PoW timing for scoring ---
    if (params.gdprMode) {
      if (params.solveTimeMs !== undefined) {
        if (params.solveTimeMs < 100) {
          score += 25;
          anomalies.push('pow_solve_too_fast');
        } else if (params.solveTimeMs < 500) {
          score += 10;
          anomalies.push('pow_solve_fast');
        } else if (params.solveTimeMs > 30_000) {
          score += 5;
          anomalies.push('pow_solve_slow');
        } else if (params.solveTimeMs >= 1000 && params.solveTimeMs <= 15_000) {
          score -= 10;
        }
      }
      score = Math.max(0, Math.min(100, score));
      return { score, anomalies };
    }

    // --- PoW solve time analysis ---
    if (params.solveTimeMs !== undefined) {
      if (params.solveTimeMs < 100) {
        // Suspiciously fast — likely GPU or pre-computed
        score += 25;
        anomalies.push('pow_solve_too_fast');
      } else if (params.solveTimeMs < 500) {
        // Fast but plausible for modern hardware
        score += 10;
        anomalies.push('pow_solve_fast');
      } else if (params.solveTimeMs > 30_000) {
        // Very slow — could be a weak device or throttled bot
        score += 5;
        anomalies.push('pow_solve_slow');
      } else if (params.solveTimeMs >= 1000 && params.solveTimeMs <= 15_000) {
        // Reasonable human-like range
        score -= 10;
      }
    }

    // --- Fingerprint consistency ---
    if (params.fingerprintConsistency < 50) {
      score += 20;
      anomalies.push('fingerprint_inconsistent');
    } else if (params.fingerprintConsistency < 80) {
      score += 10;
      anomalies.push('fingerprint_partially_inconsistent');
    } else if (params.fingerprintConsistency >= 90) {
      score -= 10;
    }

    // --- Behavior analysis ---
    // In invisible mode, behavior collection window is very short (~150ms),
    // so we expect less interaction and weight it lower.
    // In managed mode, the user clicks a checkbox, so we expect more interaction.
    const isInvisible = params.mode === 'invisible' || !params.mode;

    if (params.behaviorData) {
      behaviorScore = this.analyzeBehavior(params.behaviorData, anomalies);
      if (isInvisible) {
        // Invisible mode: behavior is a weak signal, don't penalize as hard
        if (behaviorScore < 30) {
          score += 5;
        } else if (behaviorScore >= 60) {
          score -= 10;
        }
      } else {
        // Managed mode: user clicked a checkbox, expect real interaction
        if (behaviorScore < 30) {
          score += 20;
        } else if (behaviorScore < 60) {
          score += 10;
        } else if (behaviorScore >= 80) {
          score -= 15;
        }
      }
    } else if (!isInvisible) {
      // Managed mode with no behavior data at all is suspicious
      score += 15;
      anomalies.push('managed_mode_no_behavior');
    }

    // --- JA3 hash presence ---
    if (!params.ja3Hash) {
      // Missing TLS fingerprint — can indicate non-browser client
      score += 5;
      anomalies.push('missing_ja3');
    }

    // Clamp score to 0-100
    score = Math.max(0, Math.min(100, score));

    return {
      score,
      behaviorScore,
      anomalies,
    };
  }

  /**
   * Analyze mouse/keyboard/touch behavior signals.
   * Returns a behavior score from 0 (bot-like) to 100 (human-like).
   */
  private analyzeBehavior(
    data: Record<string, unknown>,
    anomalies: string[],
  ): number {
    let behaviorScore = 50;

    // Mouse movement analysis
    const mouseMovements = data.mouseMovements as number | undefined;
    if (mouseMovements !== undefined) {
      if (mouseMovements === 0) {
        behaviorScore -= 30;
        anomalies.push('no_mouse_movement');
      } else if (mouseMovements < 5) {
        behaviorScore -= 15;
        anomalies.push('minimal_mouse_movement');
      } else if (mouseMovements > 20) {
        behaviorScore += 20;
      }
    }

    // Keyboard events
    const keystrokes = data.keystrokes as number | undefined;
    if (keystrokes !== undefined) {
      if (keystrokes === 0 && mouseMovements === 0) {
        behaviorScore -= 20;
        anomalies.push('no_interaction');
      }
    }

    // Time on page
    const timeOnPageMs = data.timeOnPageMs as number | undefined;
    if (timeOnPageMs !== undefined) {
      if (timeOnPageMs < 500) {
        behaviorScore -= 25;
        anomalies.push('too_fast_page_interaction');
      } else if (timeOnPageMs > 3000) {
        behaviorScore += 15;
      }
    }

    // Touch events (mobile)
    const touchEvents = data.touchEvents as number | undefined;
    if (touchEvents !== undefined && touchEvents > 0) {
      behaviorScore += 10;
    }

    // Scroll events
    const scrollEvents = data.scrollEvents as number | undefined;
    if (scrollEvents !== undefined && scrollEvents > 0) {
      behaviorScore += 5;
    }

    return Math.max(0, Math.min(100, behaviorScore));
  }
}
