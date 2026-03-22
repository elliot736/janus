import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | object;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object') {
        message = exceptionResponse;
      } else {
        message = { message: exceptionResponse };
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        message: 'Internal server error',
      };

      // Log unexpected errors — omit stack traces in production to prevent info leaks
      const detail = process.env.NODE_ENV === 'production'
        ? (exception instanceof Error ? exception.message : String(exception))
        : (exception instanceof Error ? exception.stack : String(exception));
      this.logger.error(
        `Unhandled exception on ${request.method} ${request.url.split('?')[0]}`,
        detail,
      );
    }

    const body =
      typeof message === 'object'
        ? {
            ...message,
            timestamp: new Date().toISOString(),
            path: request.url,
          }
        : {
            statusCode: status,
            message,
            timestamp: new Date().toISOString(),
            path: request.url,
          };

    response.status(status).json(body);
  }
}
