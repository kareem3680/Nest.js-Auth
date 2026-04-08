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

    const errorResponse: Record<string, unknown> = {
      status: 'error',
      message: 'Internal server error',
    };

    if (exception instanceof ApiErrorException) {
      statusCode = exception.statusCode;

      Object.assign(errorResponse, {
        status: Number(statusCode) >= 500 ? 'error' : 'fail',
        message: exception.message,
      });
    } else if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        Object.assign(errorResponse, {
          status: Number(statusCode) >= 500 ? 'error' : 'fail',
          message: exceptionResponse,
        });
      } else {
        const resp = exceptionResponse as Record<string, unknown>;

        Object.assign(errorResponse, {
          status: Number(statusCode) >= 500 ? 'error' : 'fail',
          ...resp,
        });
      }
    } else {
      statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    }

    if (Number(statusCode) >= 500) {
      const errorInfo =
        exception instanceof Error
          ? { stack: exception.stack }
          : { error: String(exception) };

      void this.logger.error(
        `[${request.method}] ${request.url} - ${String(errorResponse.message)}`,
        errorInfo,
      );
    } else {
      void this.logger.warn(
        `[${request.method}] ${request.url} - ${String(errorResponse.message)}`,
      );
    }

    const isDevelopment = process.env.NODE_ENV === 'development';

    if (isDevelopment && exception instanceof Error) {
      errorResponse['error'] = exception.message;
      errorResponse['stack'] = exception.stack;
    }

    response.status(statusCode).json(errorResponse);
  }
}
