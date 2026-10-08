import { Injectable, type PipeTransform } from '@nestjs/common';
import type { ZodType, ZodTypeDef } from 'zod';
import { ZodError } from 'zod';
import { AuthException } from './auth-exception';

@Injectable()
export class ZodValidationPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodType<T, ZodTypeDef, unknown>) {}

  transform(value: unknown): T {
    try {
      return this.schema.parse(value);
    } catch (error) {
      if (!(error instanceof ZodError)) throw error;
      if (
        error.issues.some(
          (issue) => issue.message === 'New password must differ from current password.',
        )
      ) {
        throw new AuthException(
          400,
          'PASSWORD_UNCHANGED',
          'New password must differ from current password.',
        );
      }
      throw new AuthException(400, 'VALIDATION_ERROR', 'Request validation failed.', {
        fields: Object.fromEntries(
          error.issues.map((issue) => [issue.path.join('.'), issue.message]),
        ),
      });
    }
  }
}
