import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

/**
 * Tracks recent verification outcomes per site and computes an adaptive
 * difficulty adjustment. When a site is under attack (high block rate),
 * difficulty is automatically increased. When traffic normalizes, it
 * decays back to the baseline.
 *
 * Uses Redis sorted sets with a sliding window. Each verification outcome
 * is stored as a timestamped entry. The block rate is computed from the
 * ratio of blocked entries to total entries in the window.
 */
@Injectable()
export class AdaptiveDifficultyService implements OnModuleDestroy {
  private readonly logger = new Logger(AdaptiveDifficultyService.name);
  private redis: Redis | null = null;

  /** Sliding window duration in milliseconds (default: 5 minutes) */
  private readonly windowMs = 5 * 60 * 1000;

  /**
   * Difficulty adjustment tiers based on block rate percentage.
   * Each tier adds to the site's base difficulty.
   */
  private static readonly TIERS = [
    { minBlockRate: 0.60, bonus: 4 },  // 60%+ blocks → +4 difficulty
    { minBlockRate: 0.40, bonus: 3 },  // 40%+ blocks → +3 difficulty
    { minBlockRate: 0.25, bonus: 2 },  // 25%+ blocks → +2 difficulty
    { minBlockRate: 0.15, bonus: 1 },  // 15%+ blocks → +1 difficulty
  ];

  /** Maximum total difficulty (base + bonus) */
  private static readonly MAX_DIFFICULTY = 8;

  /** Minimum number of recent verifications before adaptive kicks in */
  private static readonly MIN_SAMPLE_SIZE = 10;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        maxRetriesPerRequest: 1,
        retryStrategy: (times) => Math.min(times * 500, 5000),
      });
      this.redis.on('error', () => {});
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      await this.redis.quit();
    }
  }

  /**
   * Record a verification outcome for adaptive tracking.
   * Called after each verification completes.
   */
  async recordOutcome(siteId: string, action: 'allow' | 'challenge' | 'block'): Promise<void> {
    if (!this.redis) return;

    try {
      const now = Date.now();
      const totalKey = `adaptive:total:${siteId}`;
      const blockKey = `adaptive:blocks:${siteId}`;

      const pipeline = this.redis.pipeline();

      // Add to total verifications set
      pipeline.zadd(totalKey, now.toString(), `${now}:${Math.random().toString(36).slice(2, 8)}`);
      pipeline.pexpire(totalKey, this.windowMs);

      // Add to blocks set if blocked
      if (action === 'block') {
        pipeline.zadd(blockKey, now.toString(), `${now}:${Math.random().toString(36).slice(2, 8)}`);
        pipeline.pexpire(blockKey, this.windowMs);
      }

      // Prune old entries
      const cutoff = now - this.windowMs;
      pipeline.zremrangebyscore(totalKey, 0, cutoff);
      pipeline.zremrangebyscore(blockKey, 0, cutoff);

      await pipeline.exec();
    } catch {
      // Non-critical — degrade silently
    }
  }

  /**
   * Compute the adaptive difficulty for a site.
   * Returns the bonus to add on top of the site's base difficulty.
   */
  async getDifficultyBonus(siteId: string): Promise<number> {
    if (!this.redis) return 0;

    try {
      const now = Date.now();
      const cutoff = now - this.windowMs;
      const totalKey = `adaptive:total:${siteId}`;
      const blockKey = `adaptive:blocks:${siteId}`;

      const pipeline = this.redis.pipeline();
      pipeline.zcount(totalKey, cutoff, '+inf');
      pipeline.zcount(blockKey, cutoff, '+inf');
      const results = await pipeline.exec();

      const totalCount = (results?.[0]?.[1] as number) ?? 0;
      const blockCount = (results?.[1]?.[1] as number) ?? 0;

      // Need minimum sample size to avoid false positives
      if (totalCount < AdaptiveDifficultyService.MIN_SAMPLE_SIZE) {
        return 0;
      }

      const blockRate = blockCount / totalCount;

      // Find the matching tier
      for (const tier of AdaptiveDifficultyService.TIERS) {
        if (blockRate >= tier.minBlockRate) {
          this.logger.debug(
            `Site ${siteId}: block rate ${(blockRate * 100).toFixed(1)}% → +${tier.bonus} difficulty`,
          );
          return tier.bonus;
        }
      }

      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Get the effective difficulty for a site, clamped to the max.
   */
  async getEffectiveDifficulty(siteId: string, baseDifficulty: number): Promise<number> {
    const bonus = await this.getDifficultyBonus(siteId);
    return Math.min(baseDifficulty + bonus, AdaptiveDifficultyService.MAX_DIFFICULTY);
  }
}
