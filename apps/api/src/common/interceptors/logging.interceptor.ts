import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';
import { extractClientIp } from '../utils/ip';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method } = request;

    // Strip query parameters from logged path to avoid leaking secrets/tokens
    const path = request.url.split('?')[0];

    // Use the same trusted IP extraction as business logic
    const ip = extractClientIp(request);

    const userAgent = request.headers['user-agent'] || 'unknown';
    const startTime = Date.now();

    const correlationId = (request as any).correlationId as string | undefined;

    return next.handle().pipe(
      tap({
        next: () => {
          const response = ctx.getResponse<Response>();
          const duration = Date.now() - startTime;
          process.stdout.write(
            JSON.stringify({
              level: 'info',
              msg: 'HTTP request',
              correlationId,
              method,
              path,
              statusCode: response.statusCode,
              duration,
              ip,
              userAgent,
              timestamp: new Date().toISOString(),
            }) + '\n',
          );
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          const statusCode = error?.status || error?.statusCode || 500;
          process.stderr.write(
            JSON.stringify({
              level: 'error',
              msg: 'HTTP request',
              correlationId,
              method,
              path,
              statusCode,
              duration,
              ip,
              userAgent,
              error: statusCode >= 500 ? 'Internal server error' : error.message,
              timestamp: new Date().toISOString(),
            }) + '\n',
          );
        },
      }),
    );
  }
}
