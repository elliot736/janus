import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

interface CheckLimitParams {
  key: string;
  limit: number;
  windowMs: number;
}

interface CheckLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterMs?: number;
}

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(RateLimitService.name);

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) throw new Error('REDIS_URL environment variable is required');
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => Math.min(times * 200, 2000),
    });
    this.redis.on('error', (err) => this.logger.error('Redis connection error', err.message));
  }

  async onModuleDestroy() {
    await this.redis.quit();
  }

  /**
   * Sliding window rate limiter using Redis sorted sets.
   * Each request is scored by its timestamp. Expired entries are pruned
   * on each check to maintain an accurate window.
   */
  async checkLimit(params: CheckLimitParams): Promise<CheckLimitResult> {
    const { key, limit, windowMs } = params;
    const now = Date.now();
    const windowStart = now - windowMs;

    try {
      const pipeline = this.redis.pipeline();

      // Remove entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count remaining entries in the window
      pipeline.zcard(key);

      // Add current request
      pipeline.zadd(key, now.toString(), `${now}:${Math.random()}`);

      // Set TTL on the key to auto-cleanup
      pipeline.pexpire(key, windowMs);

      const results = await pipeline.exec();

      // zcard result is at index 1
      const currentCount = (results?.[1]?.[1] as number) ?? 0;

      if (currentCount >= limit) {
        // Find the oldest entry to calculate retry-after
        const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
        const oldestScore = oldest.length >= 2 ? parseInt(oldest[1], 10) : now;
        const retryAfterMs = oldestScore + windowMs - now;

        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: Math.max(0, retryAfterMs),
        };
      }

      return {
        allowed: true,
        remaining: limit - currentCount - 1,
      };
    } catch (err) {
      this.logger.error('Redis rate limit check failed', err);
      // Fail closed: deny the request if Redis is down
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: 5000,
      };
    }
  }

  /**
   * Check rate limit by fingerprint hash (for anti-abuse).
   */
  async checkFingerprintLimit(
    fingerprintHash: string,
    limit: number = 30,
    windowMs: number = 60_000,
  ): Promise<CheckLimitResult> {
    return this.checkLimit({
      key: `ratelimit:fp:${fingerprintHash}`,
      limit,
      windowMs,
    });
  }
}
