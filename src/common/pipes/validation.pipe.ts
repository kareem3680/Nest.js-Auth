import {
  PipeTransform,
  Injectable,
  ArgumentMetadata,
  BadRequestException,
} from '@nestjs/common';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';

type ClassConstructor<T = unknown> = new (...args: unknown[]) => T;

@Injectable()
export class ValidationPipe implements PipeTransform<unknown> {
  async transform(
    value: unknown,
    { metatype }: ArgumentMetadata,
  ): Promise<unknown> {
    if (!metatype || !this.toValidate(metatype)) {
      return value;
    }

    const object = plainToInstance(metatype, value);
    const errors = await validate(object as object);

    if (errors.length > 0) {
      const messages = errors.map((error) => {
        const constraints = error.constraints ?? {};
        return Object.values(constraints).join(', ');
      });

      throw new BadRequestException({
        message: 'Validation failed',
        errors: messages,
        statusCode: 400,
      });
    }

    return object;
  }

  private toValidate(metatype: unknown): metatype is ClassConstructor {
    const types: ClassConstructor[] = [String, Boolean, Number, Array, Object];
    return !types.includes(metatype as ClassConstructor);
  }
}
