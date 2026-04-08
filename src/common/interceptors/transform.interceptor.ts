import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Response as ExpressResponse } from 'express';

export interface Response<T> {
  status?: 'success' | 'error';
  message?: string;
  data?: T | T[];
  results?: number;
  paginationResult?: unknown;
  stats?: unknown;
  accessToken?: string;
  refreshToken?: string;
}

type AuthResponseObj = {
  message?: string;
  data?: unknown;
  user?: unknown;
  accessToken?: string;
  refreshToken?: string;
  results?: number;
  paginationResult?: unknown;
  stats?: unknown;
};

@Injectable()
export class TransformInterceptor<T, R = T> implements NestInterceptor<
  T,
  Response<R>
> {
  constructor(private readonly mapper?: (data: T) => R) {}

  static forMapper<T, R>(mapper: (data: T) => R) {
    return new TransformInterceptor(mapper);
  }

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<Response<R>> {
    const ctx = context.switchToHttp();
    const response = ctx.getResponse<ExpressResponse>();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data: unknown): Response<R> => {
        const mapData = (value: unknown): R | R[] | undefined => {
          if (!this.mapper || value == null) return value as R;

          if (Array.isArray(value)) {
            return value.map((v) => mapData(v)) as R[];
          }
          if (
            typeof value === 'object' &&
            value !== null &&
            '_id' in (value as any)
          ) {
            return this.mapper(value as T);
          }

          return value as R;
        };

        if (typeof data === 'object' && data !== null) {
          const obj = data as AuthResponseObj;

          if (
            typeof obj.message === 'string' &&
            !('accessToken' in obj) &&
            !('paginationResult' in obj)
          ) {
            return {
              status: statusCode >= 400 ? 'error' : 'success',
              message: obj.message,
              data: mapData(obj.data),
            };
          }

          if ('paginationResult' in obj) {
            return {
              status: 'success',
              message:
                typeof obj.message === 'string'
                  ? obj.message
                  : 'Data fetched successfully',
              results:
                typeof obj.results === 'number' ? obj.results : undefined,
              paginationResult: obj.paginationResult,
              data: mapData(obj.data),
              stats: obj.stats,
            };
          }

          if ('accessToken' in obj || 'refreshToken' in obj) {
            return {
              status: 'success',
              message:
                typeof obj.message === 'string'
                  ? obj.message
                  : 'Operation successful',
              data: mapData(obj.user ?? obj.data),
              accessToken: obj.accessToken,
              refreshToken: obj.refreshToken,
            };
          }
        }

        return {
          status: 'success',
          message: 'Operation successful',
          data: mapData(data),
        };
      }),
    );
  }
}

@Injectable()
export class GlobalTransformInterceptor extends TransformInterceptor<unknown> {
  constructor() {
    super();
  }
}
