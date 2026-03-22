import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Request } from 'express';

/**
 * Custom decorator to extract the X-Site-Key header from the request.
 * Usage: @SiteKey() siteKey: string
 */
export const SiteKey = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    return request.headers['x-site-key'] as string | undefined;
  },
);
