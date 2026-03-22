import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomBytes } from 'crypto';
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

/** Circuit breaker states */
type CircuitState = 'closed' | 'open' | 'half-open';

@Injectable()
export class RateLimitService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(RateLimitService.name);

  // Circuit breaker state
  private circuitState: CircuitState = 'closed';
  private failureCount = 0;
  private lastFailureTime = 0;

  // Circuit breaker config
  private readonly failureThreshold = 5;
  private readonly resetTimeoutMs = 30_000; // 30 seconds in open state before trying half-open

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
    // Circuit breaker: if open, allow traffic through (degraded mode)
    if (this.isCircuitOpen()) {
      this.logger.warn('Circuit breaker open — allowing request without rate limit check');
      return { allowed: true, remaining: params.limit };
    }

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
      pipeline.zadd(key, now.toString(), `${now}:${randomBytes(8).toString('hex')}`);

      // Set TTL on the key to auto-cleanup
      pipeline.pexpire(key, windowMs);

      const results = await pipeline.exec();

      // Success: reset circuit breaker
      this.onSuccess();

      // zcard result is at index 1
      const currentCount = (results?.[1]?.[1] as number) ?? 0;

      if (currentCount >= limit) {
        // Find the oldest entry to calculate retry-after
        const oldest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
        const oldestScore = oldest.length >= 2 ? parseInt(oldest[1] ?? '0', 10) : now;
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
      this.onFailure();
      this.logger.error('Redis rate limit check failed', err);

      // If circuit just opened, allow traffic (degraded mode)
      if (this.circuitState === 'open') {
        return { allowed: true, remaining: params.limit };
      }

      // Still in closed/half-open: fail closed
      return {
        allowed: false,
        remaining: 0,
        retryAfterMs: 5000,
      };
    }
  }

  private isCircuitOpen(): boolean {
    if (this.circuitState === 'open') {
      // Check if reset timeout has elapsed → transition to half-open
      if (Date.now() - this.lastFailureTime >= this.resetTimeoutMs) {
        this.circuitState = 'half-open';
        this.logger.log('Circuit breaker transitioning to half-open');
        return false;
      }
      return true;
    }
    return false;
  }

  private onSuccess(): void {
    if (this.circuitState === 'half-open') {
      this.logger.log('Circuit breaker closed after successful probe');
    }
    this.circuitState = 'closed';
    this.failureCount = 0;
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.circuitState = 'open';
      this.logger.warn(
        `Circuit breaker opened after ${this.failureCount} consecutive failures — ` +
          `rate limiting degraded for ${this.resetTimeoutMs / 1000}s`,
      );
    }
  }

  getCircuitState(): CircuitState {
    return this.circuitState;
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
