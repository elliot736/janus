import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private verificationCounters = new Map<string, number>();
  private challengeCount = 0;
  private riskScoreBuckets = new Map<number, number>();
  private riskScoreSum = 0;
  private riskScoreCount = 0;

  private static readonly HISTOGRAM_BUCKETS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  incrementVerification(action: string): void {
    const current = this.verificationCounters.get(action) ?? 0;
    this.verificationCounters.set(action, current + 1);
  }

  incrementChallenge(): void {
    this.challengeCount++;
  }

  recordRiskScore(score: number): void {
    this.riskScoreSum += score;
    this.riskScoreCount++;

    for (const bucket of MetricsService.HISTOGRAM_BUCKETS) {
      if (score <= bucket) {
        const current = this.riskScoreBuckets.get(bucket) ?? 0;
        this.riskScoreBuckets.set(bucket, current + 1);
      }
    }
  }

  serialize(): string {
    const lines: string[] = [];

    // Verification counters
    lines.push('# HELP janus_verifications_total Total number of verifications');
    lines.push('# TYPE janus_verifications_total counter');
    for (const [action, count] of this.verificationCounters) {
      lines.push(`janus_verifications_total{action="${action}"} ${count}`);
    }

    lines.push('');

    // Challenge counter
    lines.push('# HELP janus_challenges_total Total number of challenges issued');
    lines.push('# TYPE janus_challenges_total counter');
    lines.push(`janus_challenges_total ${this.challengeCount}`);

    lines.push('');

    // Risk score histogram
    lines.push('# HELP janus_risk_score_histogram Risk score distribution');
    lines.push('# TYPE janus_risk_score_histogram histogram');

    let cumulative = 0;
    for (const bucket of MetricsService.HISTOGRAM_BUCKETS) {
      cumulative += this.riskScoreBuckets.get(bucket) ?? 0;
      lines.push(`janus_risk_score_histogram_bucket{le="${bucket}"} ${cumulative}`);
    }
    lines.push(`janus_risk_score_histogram_bucket{le="+Inf"} ${this.riskScoreCount}`);
    lines.push(`janus_risk_score_histogram_sum ${this.riskScoreSum}`);
    lines.push(`janus_risk_score_histogram_count ${this.riskScoreCount}`);

    lines.push('');

    return lines.join('\n');
  }
}
