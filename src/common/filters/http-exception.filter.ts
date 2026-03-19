import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiErrorException } from '../exceptions/api-error.exception';
import { LoggerService } from '../utils/logger.util';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new LoggerService('HttpExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode: number;
    let message: string;

    // Handle known exceptions
    if (exception instanceof ApiErrorException) {
      statusCode = exception.statusCode;
      message = exception.message;
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        exceptionResponse &&
        typeof exceptionResponse === 'object' &&
        'message' in exceptionResponse
      ) {
        const resp = exceptionResponse as { message?: string | string[] };
        message = Array.isArray(resp.message)
          ? resp.message.join(', ')
          : resp.message || 'Http Exception';
      } else {
        message = 'Http Exception';
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
    }

    // Log error
    if (statusCode >= 500) {
      const errorInfo =
        exception instanceof Error
          ? { error: exception.stack }
          : { error: String(exception) };
      void this.logger.error(
        `[${request.method}] ${request.url} - ${message}`,
        errorInfo,
      );
    } else {
      void this.logger.warn(`[${request.method}] ${request.url} - ${message}`);
    }

    // Development vs Production response
    const isDevelopment = process.env.NODE_ENV === 'development';

    const errorResponse: Record<string, unknown> = {
      status: statusCode >= 500 ? 'error' : 'fail',
      message,
    };

    if (isDevelopment && exception instanceof Error) {
      errorResponse['error'] = exception.message;
      errorResponse['stack'] = exception.stack;
    }

    response.status(statusCode).json(errorResponse);
  }
}
