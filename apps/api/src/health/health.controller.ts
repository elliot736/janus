import { Controller, Get, Inject } from '@nestjs/common';
import { AllowAnonymous } from '@thallesp/nestjs-better-auth';
import { DATABASE_TOKEN, type Database } from '../db/db.provider';
import { sql } from 'drizzle-orm';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@AllowAnonymous()
@Controller()
export class HealthController {
  private readonly redis?: Redis;

  constructor(
    @Inject(DATABASE_TOKEN) private readonly db: Database,
    private readonly configService: ConfigService,
  ) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (redisUrl) {
      this.redis = new Redis(redisUrl, { maxRetriesPerRequest: 1, lazyConnect: true });
    }
  }

  /** Lightweight liveness check for ALB */
  @Get('health')
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /** Readiness check — verifies DB and Redis connectivity */
  @Get('ready')
  async ready() {
    const checks: Record<string, string> = {};

    try {
      await this.db.execute(sql`SELECT 1`);
      checks.database = 'ok';
    } catch {
      checks.database = 'failed';
    }

    try {
      if (this.redis) {
        await this.redis.ping();
        checks.redis = 'ok';
      } else {
        checks.redis = 'not configured';
      }
    } catch {
      checks.redis = 'failed';
    }

    const healthy = checks.database === 'ok' && checks.redis === 'ok';
    return { status: healthy ? 'ok' : 'degraded', checks, timestamp: new Date().toISOString() };
  }
}
