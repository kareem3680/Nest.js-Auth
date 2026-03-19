import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import mongoSanitize from 'mongo-sanitize';
import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const { window } = new JSDOM('');
const purify = createDOMPurify(window as unknown as typeof globalThis);

type SafeObject = Record<string, unknown>;

type SafeRequest = Request<
  Record<string, unknown>,
  unknown,
  unknown,
  Record<string, unknown>
>;

@Injectable()
export class SanitizeMiddleware implements NestMiddleware {
  private sanitizeValue(input: unknown): unknown {
    if (typeof input === 'string') {
      return purify.sanitize(input);
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeValue(item));
    }

    if (input && typeof input === 'object') {
      const result: SafeObject = {};

      for (const [key, value] of Object.entries(input as SafeObject)) {
        result[key] = this.sanitizeValue(value);
      }

      return result;
    }

    return input;
  }

  private sanitizeMongo(input: unknown): unknown {
    return mongoSanitize(input);
  }

  private clean<T>(input: T): T {
    const mongoCleaned = this.sanitizeMongo(input);
    const fullyCleaned = this.sanitizeValue(mongoCleaned);
    return fullyCleaned as T;
  }

  use(req: SafeRequest, res: Response, next: NextFunction): void {
    if (req.body) {
      req.body = this.clean(req.body);
    }

    if (req.params) {
      req.params = this.clean(req.params);
    }

    if (req.query) {
      req.query = this.clean(req.query);
    }

    next();
  }
}
