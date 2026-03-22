import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { RateLimitService } from './rate-limit.service';
import { extractClientIp } from '../common/utils/ip';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly rateLimitService: RateLimitService) {}

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

    // Site-key-based rate limit: 1000 requests per minute
    if (siteKey) {
      const siteAllowed = await this.rateLimitService.checkLimit({
        key: `ratelimit:site:${siteKey}`,
        limit: 1000,
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
