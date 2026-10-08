import { randomUUID } from 'node:crypto';
import { Test } from '@nestjs/testing';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import fastifyCookie from '@fastify/cookie';
import { DataSource } from 'typeorm';
import type { ApiResponse, AuthResponse, WebAuthResponse } from '@nexa/types';
import { AuthAccountEntity } from '../../src/auth/entities/auth-account.entity';
import { AuthSessionEntity } from '../../src/auth/entities/auth-session.entity';
import { UserEntity } from '../../src/users/entities/user.entity';
import { ApiExceptionFilter } from '../../src/common/filters/api-exception.filter';
import { assertDedicatedTestDatabase } from '../../src/database/test-database';
import { databaseOptions } from '../../src/database/database.options';
import { AppModule } from '../../src/app.module';

describe('auth API integration', () => {
  let app: NestFastifyApplication;
  let dataSource: DataSource;
  const testEmails = new Set<string>();

  beforeAll(async () => {
    assertDedicatedTestDatabase();
    dataSource = new DataSource(databaseOptions);
    await dataSource.initialize();
    await dataSource.runMigrations();

    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.register(fastifyCookie);
    app.setGlobalPrefix('api/v1');
    app.useGlobalFilters(new ApiExceptionFilter());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
    if (dataSource?.isInitialized) await dataSource.destroy();
  });

  afterEach(async () => {
    for (const email of testEmails) await dataSource.getRepository(UserEntity).delete({ email });
    testEmails.clear();
  });

  it('registers, authenticates, rotates refresh tokens once, changes password and revokes every session', async () => {
    const email = `auth-${randomUUID()}@example.test`;
    testEmails.add(email);
    const oldPassword = 'OldPassword123';
    const newPassword = 'NewPassword456';
    const register = await inject('POST', '/api/v1/auth/register', {
      email: ` ${email.toUpperCase()} `,
      name: '  Test User  ',
      password: oldPassword,
    });
    expect(register.statusCode).toBe(201);
    const registration = register.json<ApiResponse<AuthResponse>>().data!;
    expect(registration.user).toMatchObject({ email, name: 'Test User', role: 'user' });
    expect(registration.user).not.toHaveProperty('systemRole');
    expect(registration.tokens.expiresIn).toBe(900);

    const account = await dataSource
      .getRepository(AuthAccountEntity)
      .createQueryBuilder('account')
      .addSelect('account.passwordHash')
      .where('account.userId = :id', { id: registration.user.id })
      .getOne();
    const session = await dataSource
      .getRepository(AuthSessionEntity)
      .findOneByOrFail({ userId: registration.user.id });
    expect(account?.passwordHash).not.toBe(oldPassword);
    expect(session.refreshTokenHash).not.toBe(registration.tokens.refreshToken);
    expect(session.expiresAt.getTime() - session.createdAt.getTime()).toBeLessThanOrEqual(
      30 * 24 * 60 * 60 * 1000 + 1000,
    );

    const duplicate = await inject('POST', '/api/v1/auth/register', {
      email,
      name: 'Duplicate User',
      password: oldPassword,
    });
    expect(duplicate.statusCode).toBe(409);
    expect(duplicate.json()).toMatchObject({ error: { code: 'EMAIL_ALREADY_EXISTS' } });

    const me = await inject('GET', '/api/v1/users/me', undefined, {
      authorization: `Bearer ${registration.tokens.accessToken}`,
    });
    expect(me.statusCode).toBe(200);
    expect(me.json<ApiResponse<AuthResponse['user']>>().data?.id).toBe(registration.user.id);
    expect((await inject('GET', '/api/v1/users/me')).statusCode).toBe(401);

    const rotation = await Promise.all([
      inject('POST', '/api/v1/auth/refresh', { refreshToken: registration.tokens.refreshToken }),
      inject('POST', '/api/v1/auth/refresh', { refreshToken: registration.tokens.refreshToken }),
    ]);
    expect(rotation.map((reply) => reply.statusCode).sort()).toEqual([200, 401]);
    const rotated = rotation
      .find((reply) => reply.statusCode === 200)!
      .json<ApiResponse<AuthResponse['tokens']>>().data!;
    expect(rotated.refreshToken).not.toBe(registration.tokens.refreshToken);
    expect(
      (
        await inject('POST', '/api/v1/auth/refresh', {
          refreshToken: registration.tokens.refreshToken,
        })
      ).statusCode,
    ).toBe(401);

    const secondLogin = await inject('POST', '/api/v1/auth/login', {
      email,
      password: oldPassword,
    });
    expect(secondLogin.statusCode).toBe(200);
    const secondSession = secondLogin.json<ApiResponse<AuthResponse>>().data!;

    const wrongPassword = await inject(
      'POST',
      '/api/v1/auth/change-password',
      {
        currentPassword: 'WrongPassword123',
        newPassword,
      },
      { authorization: `Bearer ${rotated.accessToken}` },
    );
    expect(wrongPassword.statusCode).toBe(400);
    expect(wrongPassword.json()).toMatchObject({ error: { code: 'CURRENT_PASSWORD_INCORRECT' } });

    const unchanged = await inject(
      'POST',
      '/api/v1/auth/change-password',
      {
        currentPassword: oldPassword,
        newPassword: oldPassword,
      },
      { authorization: `Bearer ${rotated.accessToken}` },
    );
    expect(unchanged.statusCode).toBe(400);
    expect(unchanged.json()).toMatchObject({ error: { code: 'PASSWORD_UNCHANGED' } });

    const changed = await inject(
      'POST',
      '/api/v1/auth/change-password',
      {
        currentPassword: oldPassword,
        newPassword,
      },
      { authorization: `Bearer ${rotated.accessToken}` },
    );
    expect(changed.statusCode).toBe(204);
    expect(
      (
        await inject('GET', '/api/v1/users/me', undefined, {
          authorization: `Bearer ${secondSession.tokens.accessToken}`,
        })
      ).statusCode,
    ).toBe(401);

    expect(
      (await inject('POST', '/api/v1/auth/login', { email, password: oldPassword })).statusCode,
    ).toBe(401);
    const newLogin = await inject('POST', '/api/v1/auth/login', { email, password: newPassword });
    expect(newLogin.statusCode).toBe(200);

    const logout = await inject('POST', '/api/v1/auth/logout', {
      refreshToken: newLogin.json<ApiResponse<AuthResponse>>().data!.tokens.refreshToken,
    });
    expect(logout.statusCode).toBe(204);
  });

  it('uses a protected HttpOnly cookie for web and checks Origin on every web POST', async () => {
    const email = `web-${randomUUID()}@example.test`;
    testEmails.add(email);
    const origin = 'http://localhost:3000';
    const headers = { 'x-auth-client': 'web', origin };
    const denied = await inject(
      'POST',
      '/api/v1/auth/register',
      {
        email,
        name: 'Web User',
        password: 'WebPassword123',
      },
      { 'x-auth-client': 'web', origin: 'https://evil.example' },
    );
    expect(denied.statusCode).toBe(403);

    const deniedChangePassword = await inject(
      'POST',
      '/api/v1/auth/change-password',
      { currentPassword: 'WebPassword123', newPassword: 'NextPassword456' },
      { 'x-auth-client': 'web', origin: 'https://evil.example' },
    );
    expect(deniedChangePassword.statusCode).toBe(403);

    const register = await inject(
      'POST',
      '/api/v1/auth/register',
      {
        email,
        name: 'Web User',
        password: 'WebPassword123',
      },
      headers,
    );
    expect(register.statusCode).toBe(201);
    const body = register.json<ApiResponse<WebAuthResponse>>().data!;
    expect(body.tokens).not.toHaveProperty('refreshToken');
    const setCookie = register.headers['set-cookie'];
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain('SameSite=Lax');
    expect(setCookie).toContain('Path=/api/v1/auth');
    const cookie = String(setCookie).split(';', 1)[0]!;
    const cookieRefreshToken = cookie.slice(cookie.indexOf('=') + 1);

    const mobileTransport = await inject(
      'POST',
      '/api/v1/auth/refresh',
      { refreshToken: cookieRefreshToken },
      { 'x-auth-client': 'mobile' },
    );
    expect(mobileTransport.statusCode).toBe(401);
    expect(mobileTransport.json()).toMatchObject({ error: { code: 'INVALID_REFRESH_TOKEN' } });

    const refresh = await inject('POST', '/api/v1/auth/refresh', {}, { ...headers, cookie });
    expect(refresh.statusCode).toBe(200);
    expect(refresh.json<ApiResponse<{ accessToken: string }>>().data).not.toHaveProperty(
      'refreshToken',
    );
    const rotatedCookie = String(refresh.headers['set-cookie']).split(';', 1)[0]!;

    const logout = await inject('POST', '/api/v1/auth/logout', undefined, {
      ...headers,
      cookie: rotatedCookie,
    });
    expect(logout.statusCode).toBe(204);
    expect(logout.headers['set-cookie']).toContain('Max-Age=0');
  });

  it('logout revokes only its own session and is idempotent', async () => {
    const email = `sessions-${randomUUID()}@example.test`;
    testEmails.add(email);
    const password = 'SessionPassword123';
    const first = await inject('POST', '/api/v1/auth/register', {
      email,
      name: 'Session User',
      password,
    });
    const firstAuth = first.json<ApiResponse<AuthResponse>>().data!;
    const second = await inject('POST', '/api/v1/auth/login', { email, password });
    const secondAuth = second.json<ApiResponse<AuthResponse>>().data!;

    const logout = await inject('POST', '/api/v1/auth/logout', {
      refreshToken: firstAuth.tokens.refreshToken,
    });
    expect(logout.statusCode).toBe(204);
    expect(
      (
        await inject('GET', '/api/v1/users/me', undefined, {
          authorization: `Bearer ${firstAuth.tokens.accessToken}`,
        })
      ).statusCode,
    ).toBe(401);
    expect(
      (
        await inject('GET', '/api/v1/users/me', undefined, {
          authorization: `Bearer ${secondAuth.tokens.accessToken}`,
        })
      ).statusCode,
    ).toBe(200);

    expect(
      (
        await inject('POST', '/api/v1/auth/logout', {
          refreshToken: firstAuth.tokens.refreshToken,
        })
      ).statusCode,
    ).toBe(204);
  });

  it('rejects login and refresh for a soft-deleted user', async () => {
    const email = `deleted-${randomUUID()}@example.test`;
    testEmails.add(email);
    const password = 'DeletedPassword123';
    const registration = await inject('POST', '/api/v1/auth/register', {
      email,
      name: 'Deleted User',
      password,
    });
    const auth = registration.json<ApiResponse<AuthResponse>>().data!;
    await dataSource
      .getRepository(UserEntity)
      .update({ id: auth.user.id }, { deletedAt: new Date() });

    const login = await inject('POST', '/api/v1/auth/login', { email, password });
    expect(login.statusCode).toBe(401);
    expect(login.json()).toMatchObject({ error: { code: 'INVALID_CREDENTIALS' } });
    const refresh = await inject('POST', '/api/v1/auth/refresh', {
      refreshToken: auth.tokens.refreshToken,
    });
    expect(refresh.statusCode).toBe(401);
    expect(refresh.json()).toMatchObject({ error: { code: 'INVALID_REFRESH_TOKEN' } });
  });

  async function inject(
    method: 'GET' | 'POST',
    url: string,
    payload?: Record<string, string>,
    headers: Record<string, string> = {},
  ) {
    const response = await app
      .getHttpAdapter()
      .getInstance()
      .inject({
        method,
        url,
        ...(payload === undefined ? {} : { payload }),
        headers,
      });
    return response as unknown as {
      statusCode: number;
      headers: Record<string, string | string[] | undefined>;
      json<T = unknown>(): T;
    };
  }
});
