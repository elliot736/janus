import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request, Response } from 'express';
import { randomUUID } from 'crypto';

/**
 * Assigns a unique correlation ID to each request.
 * - If the client sends X-Request-ID, it is reused.
 * - Otherwise a new UUID is generated.
 * - The ID is attached to the request object and echoed in the response header.
 * - Other services (logging interceptor, etc.) can read req.correlationId.
 */
@Injectable()
export class CorrelationIdInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const correlationId =
      (request.headers['x-request-id'] as string) || randomUUID();

    // Attach to request for downstream use
    (request as any).correlationId = correlationId;

    // Echo in response
    response.setHeader('X-Request-ID', correlationId);

    return next.handle();
  }
}
