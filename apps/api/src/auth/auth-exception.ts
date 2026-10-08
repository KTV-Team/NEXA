import { HttpException } from '@nestjs/common';

export class AuthException extends HttpException {
  constructor(status: number, code: string, message: string, details?: Record<string, unknown>) {
    super({ code, message, ...(details ? { details } : {}) }, status);
  }
}
