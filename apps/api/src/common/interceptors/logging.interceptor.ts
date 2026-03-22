import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Request, Response } from 'express';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const { method, url } = request;

    const ip =
      (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      request.ip ||
      'unknown';

    const userAgent = request.headers['user-agent'] || 'unknown';
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = ctx.getResponse<Response>();
          const duration = Date.now() - startTime;
          process.stdout.write(
            JSON.stringify({
              level: 'info',
              msg: 'HTTP request',
              method,
              path: url,
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
              method,
              path: url,
              statusCode,
              duration,
              ip,
              userAgent,
              error: error.message,
              timestamp: new Date().toISOString(),
            }) + '\n',
          );
        },
      }),
    );
  }
}
