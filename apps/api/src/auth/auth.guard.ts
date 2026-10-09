import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthException } from './auth-exception';
import type { AuthenticatedRequest, AuthIdentity } from './auth-request';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const match = typeof header === 'string' ? /^Bearer ([^\s]+)$/.exec(header) : null;
    if (!match)
      throw new AuthException(401, 'INVALID_ACCESS_TOKEN', 'A valid bearer token is required.');

    const accessToken = match?.[1];
    if (!accessToken)
      throw new AuthException(401, 'INVALID_ACCESS_TOKEN', 'A valid bearer token is required.');
    const identity = await this.auth.authenticateAccessToken(accessToken);
    request.user = { userId: identity.userId, sessionId: identity.sessionId } satisfies AuthIdentity;
    return true;
  }
}
