import { Injectable, OnModuleDestroy, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import Redis from 'ioredis';

interface AnalyzeParams {
  fingerprintHash: string;
  ipAddress: string;
  siteId: string;
}

interface AnalyzeResult {
  anomalies: string[];
  consistencyScore: number;
}

@Injectable()
export class FingerprintService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly logger = new Logger(FingerprintService.name);

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
   * Compute a stable hash from a fingerprint object.
   * Sorts keys for deterministic output.
   */
  computeHash(fingerprint: Record<string, unknown>): string {
    const serialized = JSON.stringify(this.sortObject(fingerprint));
    if (serialized.length > 65536) {
      throw new BadRequestException('Fingerprint data too large');
    }
    return createHash('sha256').update(serialized).digest('hex');
  }

  /**
   * Cross-signal consistency checks and velocity tracking.
   */
  async analyze(params: AnalyzeParams): Promise<AnalyzeResult> {
    const anomalies: string[] = [];
    let consistencyScore = 100;

    try {
      // --- Velocity check: how many different IPs used this fingerprint recently? ---
      const fpIpKey = `fp:ips:${params.fingerprintHash}`;
      await this.redis.sadd(fpIpKey, params.ipAddress);
      await this.redis.expire(fpIpKey, 3600); // 1 hour window
      const ipCount = await this.redis.scard(fpIpKey);

      if (ipCount > 10) {
        consistencyScore -= 40;
        anomalies.push('fingerprint_high_ip_velocity');
      } else if (ipCount > 5) {
        consistencyScore -= 20;
        anomalies.push('fingerprint_moderate_ip_velocity');
      }

      // --- Velocity check: how many fingerprints from this IP recently? ---
      const ipFpKey = `ip:fps:${params.ipAddress}`;
      await this.redis.sadd(ipFpKey, params.fingerprintHash);
      await this.redis.expire(ipFpKey, 3600);
      const fpCount = await this.redis.scard(ipFpKey);

      if (fpCount > 20) {
        consistencyScore -= 30;
        anomalies.push('ip_high_fingerprint_velocity');
      } else if (fpCount > 10) {
        consistencyScore -= 15;
        anomalies.push('ip_moderate_fingerprint_velocity');
      }

      // --- Site-scoped velocity: requests from this fingerprint to this site ---
      const siteFpKey = `site:fp:${params.siteId}:${params.fingerprintHash}`;
      const siteReqCount = await this.redis.incr(siteFpKey);
      await this.redis.expire(siteFpKey, 300); // 5 minute window

      if (siteReqCount > 50) {
        consistencyScore -= 25;
        anomalies.push('fingerprint_site_flood');
      } else if (siteReqCount > 20) {
        consistencyScore -= 10;
        anomalies.push('fingerprint_site_high_rate');
      }
    } catch (err) {
      this.logger.error('Redis fingerprint analysis failed', err);
      // Fail closed: return worst-case analysis
      return { anomalies: ['redis_unavailable'], consistencyScore: 0 };
    }

    consistencyScore = Math.max(0, Math.min(100, consistencyScore));

    return { anomalies, consistencyScore };
  }

  private sortObject(obj: Record<string, unknown>): Record<string, unknown> {
    const sorted: Record<string, unknown> = {};
    const keys = Object.keys(obj).sort();
    for (const key of keys) {
      const value = obj[key];
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        sorted[key] = this.sortObject(value as Record<string, unknown>);
      } else {
        sorted[key] = value;
      }
    }
    return sorted;
  }
}
