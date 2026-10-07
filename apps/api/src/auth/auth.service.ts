import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { randomBytes, createHash } from 'node:crypto';
import { hash, verify, argon2id } from 'argon2';
import { DataSource, IsNull, QueryFailedError, Repository } from 'typeorm';
import type {
  AuthClientType,
  AuthResponse,
  AuthTokens,
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  User,
  WebAuthTokens,
} from '@nexa/types';
import { AuthAccountEntity } from './entities/auth-account.entity';
import { AuthSessionEntity } from './entities/auth-session.entity';
import { UserEntity } from '../users/entities/user.entity';
import { AuthException } from './auth-exception';
import type { AuthIdentity } from './auth-request';

const ACCESS_SECONDS = 15 * 60;
const SESSION_MILLISECONDS = 30 * 24 * 60 * 60 * 1000;
const PASSWORD_OPTIONS = {
  type: argon2id,
  memoryCost: 19456,
  timeCost: 2,
  parallelism: 1,
} as const;
const DUMMY_HASH = hash('nexa-invalid-login-dummy-password', PASSWORD_OPTIONS);

@Injectable()
export class AuthService {
  private readonly accessSecret: Buffer;

  constructor(
    private readonly dataSource: DataSource,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(AuthAccountEntity) private readonly accounts: Repository<AuthAccountEntity>,
    @InjectRepository(AuthSessionEntity) private readonly sessions: Repository<AuthSessionEntity>,
  ) {
    this.accessSecret = Buffer.from(this.config.getOrThrow<string>('AUTH_ACCESS_SECRET'), 'base64');
  }

  async register(dto: RegisterDto, client: AuthClientType): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const name = dto.name.trim();
    const passwordHash = await hash(dto.password, PASSWORD_OPTIONS);
    const refreshToken = this.newRefreshToken();
    const created = new Date();
    const expiresAt = new Date(created.getTime() + SESSION_MILLISECONDS);

    try {
      const user = await this.dataSource.transaction(async (manager) => {
        const userRepo = manager.getRepository(UserEntity);
        const accountRepo = manager.getRepository(AuthAccountEntity);
        const sessionRepo = manager.getRepository(AuthSessionEntity);
        const user = await userRepo.save(userRepo.create({ email, name, systemRole: 'USER' }));
        await accountRepo.save(
          accountRepo.create({
            userId: user.id,
            provider: 'password',
            providerSubject: email,
            passwordHash,
          }),
        );
        await sessionRepo.save(
          sessionRepo.create({
            userId: user.id,
            clientType: client,
            refreshTokenHash: this.hashToken(refreshToken),
            expiresAt,
            revokedAt: null,
          }),
        );
        return user;
      });
      return this.authResponse(user, refreshToken);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new AuthException(
          409,
          'EMAIL_ALREADY_EXISTS',
          'An account with this email already exists.',
        );
      }
      throw error;
    }
  }

  async login(dto: LoginDto, client: AuthClientType): Promise<AuthResponse> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findOne({ where: { email, deletedAt: IsNull() } });
    const account = user
      ? await this.accounts
          .createQueryBuilder('account')
          .addSelect('account.passwordHash')
          .where('account.userId = :userId', { userId: user.id })
          .andWhere('account.provider = :provider', { provider: 'password' })
          .getOne()
      : null;
    const encoded = account?.passwordHash ?? (await DUMMY_HASH);
    const passwordMatches = await verify(encoded, dto.password).catch(() => false);
    if (!user || !account || !account.passwordHash || !passwordMatches) {
      throw new AuthException(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }

    const refreshToken = this.newRefreshToken();
    await this.dataSource.transaction(async (manager) => {
      const lockedUsers = await manager.query(
        'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE',
        [user.id],
      );
      if (!lockedUsers.length)
        throw new AuthException(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
      const currentAccount = await manager
        .getRepository(AuthAccountEntity)
        .createQueryBuilder('account')
        .addSelect('account.passwordHash')
        .where('account.userId = :userId AND account.provider = :provider', {
          userId: user.id,
          provider: 'password',
        })
        .getOne();
      if (!currentAccount?.passwordHash || currentAccount.passwordHash !== account.passwordHash) {
        throw new AuthException(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
      }
      return manager.getRepository(AuthSessionEntity).save(
        manager.getRepository(AuthSessionEntity).create({
          userId: user.id,
          clientType: client,
          refreshTokenHash: this.hashToken(refreshToken),
          expiresAt: new Date(Date.now() + SESSION_MILLISECONDS),
          revokedAt: null,
        }),
      );
    });
    return this.authResponse(user, refreshToken);
  }

  async refresh(
    token: string,
    client: AuthClientType,
  ): Promise<{ tokens: AuthTokens; refreshToken: string }> {
    const tokenHash = this.hashToken(token);
    const candidate = await this.sessions.findOne({ where: { refreshTokenHash: tokenHash } });
    if (!candidate) throw this.invalidRefresh();
    const nextToken = this.newRefreshToken();
    const result = await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [candidate.userId]);
      const repo = manager.getRepository(AuthSessionEntity);
      await manager.query('SELECT id FROM auth_sessions WHERE id = $1 FOR UPDATE', [candidate.id]);
      const session = await repo.findOne({ where: { id: candidate.id } });
      if (
        !session ||
        session.refreshTokenHash !== tokenHash ||
        session.clientType !== client ||
        session.revokedAt ||
        session.expiresAt <= new Date()
      )
        throw this.invalidRefresh();
      const user = await manager.getRepository(UserEntity).findOne({
        where: { id: session.userId, deletedAt: IsNull() },
      });
      if (!user) throw this.invalidRefresh();
      session.refreshTokenHash = this.hashToken(nextToken);
      await repo.save(session);
      return { session, user };
    });
    const tokens = await this.tokenResponse(result.user.id, result.session.id, nextToken, 'mobile');
    return { tokens: tokens as AuthTokens, refreshToken: nextToken };
  }

  async logout(
    identity: AuthIdentity | null,
    token: string | null,
    client: AuthClientType,
  ): Promise<void> {
    if (token) {
      const candidate = await this.sessions.findOne({
        where: { refreshTokenHash: this.hashToken(token) },
      });
      if (!candidate || candidate.clientType !== client) return;
      await this.dataSource.transaction(async (manager) => {
        await manager.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [candidate.userId]);
        await manager.query('SELECT id FROM auth_sessions WHERE id = $1 FOR UPDATE', [
          candidate.id,
        ]);
        await manager
          .getRepository(AuthSessionEntity)
          .update(
            { id: candidate.id, refreshTokenHash: this.hashToken(token), revokedAt: IsNull() },
            { revokedAt: new Date() },
          );
      });
      return;
    }
    if (!identity) return;
    await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [identity.userId]);
      await manager.query('SELECT id FROM auth_sessions WHERE id = $1 FOR UPDATE', [
        identity.sessionId,
      ]);
      const session = await manager.getRepository(AuthSessionEntity).findOne({
        where: {
          id: identity.sessionId,
          userId: identity.userId,
          clientType: client,
          revokedAt: IsNull(),
        },
      });
      if (!session) return;
      await manager
        .getRepository(AuthSessionEntity)
        .update(
          { id: session.id, userId: identity.userId, clientType: client, revokedAt: IsNull() },
          { revokedAt: new Date() },
        );
    });
  }

  async changePassword(identity: AuthIdentity, dto: ChangePasswordDto): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.query('SELECT id FROM users WHERE id = $1 FOR UPDATE', [identity.userId]);
      const accounts = manager.getRepository(AuthAccountEntity);
      const account = await accounts
        .createQueryBuilder('account')
        .addSelect('account.passwordHash')
        .where('account.userId = :userId AND account.provider = :provider', {
          userId: identity.userId,
          provider: 'password',
        })
        .getOne();
      if (
        !account?.passwordHash ||
        !(await verify(account.passwordHash, dto.currentPassword).catch(() => false))
      ) {
        throw new AuthException(
          400,
          'CURRENT_PASSWORD_INCORRECT',
          'Current password is incorrect.',
        );
      }
      account.passwordHash = await hash(dto.newPassword, PASSWORD_OPTIONS);
      await accounts.save(account);
      await manager
        .getRepository(AuthSessionEntity)
        .update({ userId: identity.userId, revokedAt: IsNull() }, { revokedAt: new Date() });
    });
  }

  async getCurrentUser(userId: string): Promise<User> {
    const user = await this.users.findOne({ where: { id: userId, deletedAt: IsNull() } });
    if (!user)
      throw new AuthException(401, 'INVALID_ACCESS_TOKEN', 'Access token is invalid or expired.');
    return this.serializeUser(user);
  }

  async resolveLogoutAccessToken(token: string | null): Promise<AuthIdentity | null> {
    if (!token) return null;
    try {
      const claims = await this.jwt.verifyAsync<{ sub?: string; sid?: string; tokenType?: string }>(
        token,
        {
          algorithms: ['HS256'],
          issuer: 'nexa-api',
          audience: 'nexa-client',
        },
      );
      return claims.sub && claims.sid && claims.tokenType === 'access'
        ? { userId: claims.sub, sessionId: claims.sid }
        : null;
    } catch {
      return null;
    }
  }

  private async authResponse(user: UserEntity, refreshToken: string): Promise<AuthResponse> {
    return {
      user: this.serializeUser(user),
      tokens: (await this.tokenResponse(user.id, '', refreshToken, 'mobile')) as AuthTokens,
    };
  }

  async getRefreshExpiry(token: string, client: AuthClientType): Promise<Date | null> {
    const session = await this.sessions.findOne({
      where: { refreshTokenHash: this.hashToken(token), clientType: client, revokedAt: IsNull() },
    });
    return session?.expiresAt ?? null;
  }

  private async tokenResponse(
    userId: string,
    sessionId: string,
    refreshToken: string,
    client: AuthClientType,
  ): Promise<AuthTokens | WebAuthTokens> {
    // Session ids are passed directly for login/refresh. Registration resolves its row after creating it.
    const sid =
      sessionId ||
      (await this.sessions.findOne({ where: { refreshTokenHash: this.hashToken(refreshToken) } }))
        ?.id;
    if (!sid) throw new Error('Auth session was not persisted.');
    const accessToken = await this.jwt.signAsync(
      { sub: userId, sid, tokenType: 'access' },
      {
        secret: this.accessSecret,
        algorithm: 'HS256',
        issuer: 'nexa-api',
        audience: 'nexa-client',
        expiresIn: ACCESS_SECONDS,
      },
    );
    return client === 'web'
      ? { accessToken, expiresIn: ACCESS_SECONDS }
      : { accessToken, refreshToken, expiresIn: ACCESS_SECONDS };
  }

  private serializeUser(user: UserEntity): User {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: 'user',
      ...(user.avatarUrl ? { avatarUrl: user.avatarUrl } : {}),
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  private newRefreshToken(): string {
    return randomBytes(32).toString('base64url');
  }
  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
  private invalidRefresh(): AuthException {
    return new AuthException(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or expired.');
  }
  private isUniqueViolation(error: unknown): boolean {
    return (
      error instanceof QueryFailedError && (error.driverError as { code?: string }).code === '23505'
    );
  }
}
