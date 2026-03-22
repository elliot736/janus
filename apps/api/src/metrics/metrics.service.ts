import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class MetricsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MetricsService.name);
  private redis: Redis | null = null;

  // In-memory counters (always authoritative during runtime)
  private verificationCounters = new Map<string, number>();
  private challengeCount = 0;
  private riskScoreBuckets = new Map<number, number>();
  private riskScoreSum = 0;
  private riskScoreCount = 0;

  private static readonly HISTOGRAM_BUCKETS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];
  private static readonly REDIS_KEY_PREFIX = 'janus:metrics:';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) return;

    try {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => Math.min(times * 500, 5000),
      });
      this.redis.on('error', () => {}); // Suppress connection errors in logs
      await this.restoreFromRedis();
    } catch {
      this.logger.warn('Could not connect to Redis for metrics persistence — using in-memory only');
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.persistToRedis();
      await this.redis.quit();
    }
  }

  incrementVerification(action: string): void {
    const current = this.verificationCounters.get(action) ?? 0;
    this.verificationCounters.set(action, current + 1);
    this.persistField(`verification:${action}`, current + 1);
  }

  incrementChallenge(): void {
    this.challengeCount++;
    this.persistField('challenges', this.challengeCount);
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

    this.persistField('risk_score_sum', this.riskScoreSum);
    this.persistField('risk_score_count', this.riskScoreCount);
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

  /** Fire-and-forget persist of a single field to Redis */
  private persistField(key: string, value: number): void {
    if (!this.redis) return;
    this.redis.set(`${MetricsService.REDIS_KEY_PREFIX}${key}`, value.toString()).catch(() => {});
  }

  /** Persist all counters to Redis (called on shutdown) */
  private async persistToRedis(): Promise<void> {
    if (!this.redis) return;

    try {
      const pipeline = this.redis.pipeline();

      for (const [action, count] of this.verificationCounters) {
        pipeline.set(`${MetricsService.REDIS_KEY_PREFIX}verification:${action}`, count.toString());
      }
      pipeline.set(`${MetricsService.REDIS_KEY_PREFIX}challenges`, this.challengeCount.toString());
      pipeline.set(`${MetricsService.REDIS_KEY_PREFIX}risk_score_sum`, this.riskScoreSum.toString());
      pipeline.set(`${MetricsService.REDIS_KEY_PREFIX}risk_score_count`, this.riskScoreCount.toString());

      for (const bucket of MetricsService.HISTOGRAM_BUCKETS) {
        const value = this.riskScoreBuckets.get(bucket) ?? 0;
        pipeline.set(`${MetricsService.REDIS_KEY_PREFIX}bucket:${bucket}`, value.toString());
      }

      await pipeline.exec();
      this.logger.log('Metrics persisted to Redis');
    } catch {
      this.logger.warn('Failed to persist metrics to Redis');
    }
  }

  /** Restore counters from Redis on startup */
  private async restoreFromRedis(): Promise<void> {
    if (!this.redis) return;

    try {
      // Restore verification counters
      for (const action of ['allow', 'challenge', 'block']) {
        const val = await this.redis.get(`${MetricsService.REDIS_KEY_PREFIX}verification:${action}`);
        if (val) this.verificationCounters.set(action, parseInt(val, 10));
      }

      // Restore challenge count
      const challenges = await this.redis.get(`${MetricsService.REDIS_KEY_PREFIX}challenges`);
      if (challenges) this.challengeCount = parseInt(challenges, 10);

      // Restore risk score aggregates
      const sum = await this.redis.get(`${MetricsService.REDIS_KEY_PREFIX}risk_score_sum`);
      const count = await this.redis.get(`${MetricsService.REDIS_KEY_PREFIX}risk_score_count`);
      if (sum) this.riskScoreSum = parseInt(sum, 10);
      if (count) this.riskScoreCount = parseInt(count, 10);

      // Restore histogram buckets
      for (const bucket of MetricsService.HISTOGRAM_BUCKETS) {
        const val = await this.redis.get(`${MetricsService.REDIS_KEY_PREFIX}bucket:${bucket}`);
        if (val) this.riskScoreBuckets.set(bucket, parseInt(val, 10));
      }

      this.logger.log('Metrics restored from Redis');
    } catch {
      this.logger.warn('Could not restore metrics from Redis — starting fresh');
    }
  }
}
