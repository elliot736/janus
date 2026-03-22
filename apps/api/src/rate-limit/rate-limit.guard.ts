import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request } from 'express';
import { RateLimitService } from './rate-limit.service';
import { extractClientIp } from '../common/utils/ip';
import { DATABASE_TOKEN, type Database } from '../db/db.provider';
import { sites } from '../db/schema';
import { eq } from 'drizzle-orm';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly rateLimitService: RateLimitService,
    @Inject(DATABASE_TOKEN) private readonly db: Database,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    const ipAddress = extractClientIp(request);

    const siteKey = request.headers['x-site-key'] as string | undefined;

    // IP-based rate limit: 100 requests per minute
    const ipAllowed = await this.rateLimitService.checkLimit({
      key: `ratelimit:ip:${ipAddress}`,
      limit: 100,
      windowMs: 60_000,
    });

    if (!ipAllowed.allowed) {
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Rate limit exceeded',
          retryAfter: ipAllowed.retryAfterMs,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // Site-key-based rate limit: configurable per site (default: 1000/min)
    if (siteKey) {
      let siteLimit = 1000;

      try {
        const [site] = await this.db
          .select({ settings: sites.settings })
          .from(sites)
          .where(eq(sites.siteKey, siteKey));
        if (site?.settings?.rateLimitPerMinute) {
          siteLimit = site.settings.rateLimitPerMinute;
        }
      } catch {
        // Use default if lookup fails
      }

      const siteAllowed = await this.rateLimitService.checkLimit({
        key: `ratelimit:site:${siteKey}`,
        limit: siteLimit,
        windowMs: 60_000,
      });

      if (!siteAllowed.allowed) {
        throw new HttpException(
          {
            statusCode: HttpStatus.TOO_MANY_REQUESTS,
            message: 'Site rate limit exceeded',
            retryAfter: siteAllowed.retryAfterMs,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    return true;
  }
}
