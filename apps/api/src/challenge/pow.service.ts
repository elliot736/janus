import { Injectable, OnModuleDestroy, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import Redis from 'ioredis';

@Injectable()
export class PowService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(PowService.name);

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
   * Verifies the Proof-of-Work solution:
   * 1. The SHA-256 hash of `challenge + nonce` must have `difficulty` leading zero hex chars
   * 2. The nonce must not have been previously used (replay protection via Redis)
   * 3. The solve time must be within a reasonable range
   */
  async verifyPow(params: {
    challenge: string;
    nonce: string;
    difficulty: number;
    challengeId: string;
    solveTimeMs?: number;
  }): Promise<{ valid: boolean; reason?: string }> {
    const { challenge, nonce, difficulty, challengeId, solveTimeMs } = params;

    // 1. Check the hash has required leading zeros
    const input = `${challenge}${nonce}`;
    const hash = createHash('sha256').update(input).digest('hex');
    const requiredPrefix = '0'.repeat(difficulty);

    if (!hash.startsWith(requiredPrefix)) {
      return {
        valid: false,
        reason: `Hash does not meet difficulty requirement (need ${difficulty} leading zeros)`,
      };
    }

    // 2. Check nonce hasn't been used (replay protection)
    const nonceKey = `pow:nonce:${challengeId}:${nonce}`;
    try {
      const wasSet = await this.redis.set(nonceKey, '1', 'EX', 600, 'NX');
      if (!wasSet) {
        return { valid: false, reason: 'Nonce already used' };
      }
    } catch (err) {
      this.logger.error('Redis nonce check failed', err);
      return { valid: false, reason: 'Internal verification error' };
    }

    // 3. Validate solve time is reasonable (not too fast = bot, not too slow = stale)
    if (solveTimeMs !== undefined) {
      if (solveTimeMs < 50) {
        return {
          valid: false,
          reason: 'Solution computed too quickly — possible pre-computation',
        };
      }
      if (solveTimeMs > 300_000) {
        return {
          valid: false,
          reason: 'Solution took too long',
        };
      }
    }

    return { valid: true };
  }

  /**
   * Calculate the expected hash for external validation
   */
  computeHash(challenge: string, nonce: string): string {
    return createHash('sha256').update(`${challenge}${nonce}`).digest('hex');
  }
}
