import { PipeTransform, Injectable } from '@nestjs/common';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = DOMPurify(window);

type Sanitizable =
  | string
  | number
  | boolean
  | null
  | undefined
  | Sanitizable[]
  | { [key: string]: Sanitizable };

@Injectable()
export class SanitizePipe implements PipeTransform {
  transform(value: unknown): Sanitizable {
    if (value === null || value === undefined) return value;
    return this.sanitizeValue(value);
  }

  private sanitizeValue(input: unknown): Sanitizable {
    if (typeof input === 'string') {
      return purify.sanitize(input);
    }

    if (Array.isArray(input)) {
      return input.map((item) => this.sanitizeValue(item));
    }

    if (this.isObject(input)) {
      const sanitized: Record<string, Sanitizable> = {};

      for (const key of Object.keys(input)) {
        sanitized[key] = this.sanitizeValue(input[key]);
      }

      return sanitized;
    }

    return input as Sanitizable;
  }

  private isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
