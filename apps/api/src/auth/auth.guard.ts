import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { IsNull, Repository } from 'typeorm';
import { AuthException } from './auth-exception';
import type { AuthenticatedRequest, AuthIdentity } from './auth-request';
import { AuthSessionEntity } from './entities/auth-session.entity';
import { UserEntity } from '../users/entities/user.entity';

interface AccessClaims {
  sub: string;
  sid: string;
  tokenType: 'access';
  iat: number;
  exp: number;
  iss: string;
  aud: string | string[];
}

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @InjectRepository(AuthSessionEntity) private readonly sessions: Repository<AuthSessionEntity>,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const match = typeof header === 'string' ? /^Bearer ([^\s]+)$/.exec(header) : null;
    if (!match)
      throw new AuthException(401, 'INVALID_ACCESS_TOKEN', 'A valid bearer token is required.');

    const accessToken = match?.[1];
    if (!accessToken)
      throw new AuthException(401, 'INVALID_ACCESS_TOKEN', 'A valid bearer token is required.');
    let claims: AccessClaims;
    try {
      claims = await this.jwt.verifyAsync<AccessClaims>(accessToken, {
        algorithms: ['HS256'],
        issuer: 'nexa-api',
        audience: 'nexa-client',
      });
    } catch {
      throw new AuthException(401, 'INVALID_ACCESS_TOKEN', 'Access token is invalid or expired.');
    }
    if (
      !claims.sub ||
      !claims.sid ||
      claims.tokenType !== 'access' ||
      typeof claims.iat !== 'number' ||
      typeof claims.exp !== 'number'
    ) {
      throw new AuthException(401, 'INVALID_ACCESS_TOKEN', 'Access token is invalid or expired.');
    }

    const session = await this.sessions.findOne({ where: { id: claims.sid, userId: claims.sub } });
    if (!session || session.revokedAt || session.expiresAt <= new Date()) {
      throw new AuthException(401, 'SESSION_REVOKED', 'The session is no longer active.');
    }
    const user = await this.users.findOne({ where: { id: claims.sub, deletedAt: IsNull() } });
    if (!user)
      throw new AuthException(401, 'INVALID_ACCESS_TOKEN', 'Access token is invalid or expired.');

    const identity: AuthIdentity = { userId: user.id, sessionId: session.id };
    request.user = identity;
    return true;
  }
}
