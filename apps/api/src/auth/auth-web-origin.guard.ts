import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { authClientSchema } from '@nexa/validation';
import { AuthException } from './auth-exception';
import type { AuthenticatedRequest } from './auth-request';

@Injectable()
export class AuthWebOriginGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const value = request.headers['x-auth-client'];
    if (value === undefined || value === 'mobile') return true;
    if (!authClientSchema.safeParse(value).success) {
      throw new AuthException(400, 'VALIDATION_ERROR', 'X-Auth-Client must be mobile or web.');
    }

    const origin = request.headers.origin;
    const allowed = this.config.get<string[]>('AUTH_WEB_ORIGINS') ?? [];
    if (typeof origin !== 'string' || origin === 'null' || !allowed.includes(origin)) {
      throw new AuthException(403, 'ORIGIN_NOT_ALLOWED', 'Web origin is not allowed.');
    }
    return true;
  }
}
