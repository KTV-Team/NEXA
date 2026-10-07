import {
  Body,
  Controller,
  Header,
  HttpCode,
  HttpStatus,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import type { AuthClientType, AuthTokens } from '@nexa/types';
import {
  authClientSchema,
  changePasswordSchema,
  loginSchema,
  logoutSchema,
  refreshSchema,
  registerSchema,
} from '@nexa/validation';
import { AuthService } from './auth.service';
import { AuthException } from './auth-exception';
import { AuthGuard } from './auth.guard';
import { AuthWebOriginGuard } from './auth-web-origin.guard';
import { CurrentAuth } from './current-auth.decorator';
import type { AuthenticatedRequest, AuthIdentity } from './auth-request';
import { ZodValidationPipe } from './zod-validation.pipe';
import type { LoginDto, RegisterDto, ChangePasswordDto } from '@nexa/types';

const COOKIE_NAME = 'nexa_rt';
const COOKIE_PATH = '/api/v1/auth';
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

interface AuthReply {
  setCookie(
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      secure: boolean;
      sameSite: 'lax';
      path: string;
      maxAge: number;
    },
  ): AuthReply;
  clearCookie(
    name: string,
    options: { path: string; httpOnly: boolean; sameSite: 'lax'; secure: boolean },
  ): AuthReply;
}

@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly config: ConfigService,
  ) {}

  @Post('register')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  async register(
    @Body(new ZodValidationPipe(registerSchema)) dto: RegisterDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: AuthReply,
  ) {
    const client = this.client(request);
    this.assertWebOrigin(request, client);
    const result = await this.auth.register(dto, client);
    return this.issueResponse(result.user, result.tokens, client, reply);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  async login(
    @Body(new ZodValidationPipe(loginSchema)) dto: LoginDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: AuthReply,
  ) {
    const client = this.client(request);
    this.assertWebOrigin(request, client);
    const result = await this.auth.login(dto, client);
    return this.issueResponse(result.user, result.tokens, client, reply);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Header('Cache-Control', 'no-store')
  async refresh(
    @Body(new ZodValidationPipe(refreshSchema)) body: { refreshToken?: string },
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: AuthReply,
  ) {
    const client = this.client(request);
    this.assertWebOrigin(request, client);
    if (client === 'web' && body.refreshToken !== undefined) {
      throw new AuthException(
        400,
        'VALIDATION_ERROR',
        'Web refresh tokens must be sent using the HttpOnly cookie.',
      );
    }
    const token = this.refreshToken(client, body.refreshToken, request);
    const result = await this.auth.refresh(token, client);
    if (client === 'web') {
      await this.setRefreshCookie(reply, result.refreshToken, client);
      return { accessToken: result.tokens.accessToken, expiresIn: result.tokens.expiresIn };
    }
    return result.tokens;
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  async logout(
    @Body(new ZodValidationPipe(logoutSchema)) body: { refreshToken?: string } | undefined,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: AuthReply,
  ) {
    const client = this.client(request);
    this.assertWebOrigin(request, client);
    if (client === 'web' && body?.refreshToken !== undefined) {
      throw new AuthException(
        400,
        'VALIDATION_ERROR',
        'Web refresh tokens must be sent using the HttpOnly cookie.',
      );
    }
    const token =
      client === 'web' ? (request.cookies?.[COOKIE_NAME] ?? null) : (body?.refreshToken ?? null);
    const identity = token ? null : await this.auth.resolveLogoutAccessToken(this.bearer(request));
    await this.auth.logout(identity, token, client);
    if (client === 'web') this.clearRefreshCookie(reply);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Header('Cache-Control', 'no-store')
  @UseGuards(AuthWebOriginGuard, AuthGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async changePassword(
    @Body(new ZodValidationPipe(changePasswordSchema)) dto: ChangePasswordDto,
    @CurrentAuth() identity: AuthIdentity,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) reply: AuthReply,
  ) {
    const client = this.client(request);
    this.assertWebOrigin(request, client);
    await this.auth.changePassword(identity, dto);
    if (client === 'web') this.clearRefreshCookie(reply);
  }

  private client(request: AuthenticatedRequest): AuthClientType {
    const value = request.headers['x-auth-client'];
    if (value === undefined) return 'mobile';
    const parsed = authClientSchema.safeParse(value);
    if (!parsed.success)
      throw new AuthException(400, 'VALIDATION_ERROR', 'X-Auth-Client must be mobile or web.');
    return parsed.data;
  }

  private assertWebOrigin(request: AuthenticatedRequest, client: AuthClientType): void {
    if (client !== 'web') return;
    const origin = request.headers.origin;
    const allowed = this.config.get<string[]>('AUTH_WEB_ORIGINS') ?? [];
    if (typeof origin !== 'string' || origin === 'null' || !allowed.includes(origin)) {
      throw new AuthException(403, 'ORIGIN_NOT_ALLOWED', 'Web origin is not allowed.');
    }
  }

  private refreshToken(
    client: AuthClientType,
    bodyToken: string | undefined,
    request: AuthenticatedRequest,
  ): string {
    const token = client === 'web' ? request.cookies?.[COOKIE_NAME] : bodyToken;
    if (!token) throw new AuthException(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is required.');
    return token;
  }

  private async issueResponse(
    user: unknown,
    tokens: AuthTokens,
    client: AuthClientType,
    reply: AuthReply,
  ) {
    if (client === 'web') {
      await this.setRefreshCookie(reply, tokens.refreshToken, client);
      return { user, tokens: { accessToken: tokens.accessToken, expiresIn: tokens.expiresIn } };
    }
    return { user, tokens };
  }

  private async setRefreshCookie(
    reply: AuthReply,
    token: string,
    client: AuthClientType,
  ): Promise<void> {
    const expiresAt = await this.auth.getRefreshExpiry(token, client);
    const maxAge = expiresAt
      ? Math.max(0, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
      : MAX_AGE_SECONDS;
    reply.setCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: this.config.get<string>('NODE_ENV') === 'production',
      sameSite: 'lax',
      path: COOKIE_PATH,
      maxAge,
    });
  }

  private clearRefreshCookie(reply: AuthReply): void {
    reply.clearCookie(COOKIE_NAME, {
      path: COOKIE_PATH,
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get<string>('NODE_ENV') === 'production',
    });
  }

  private bearer(request: AuthenticatedRequest): string | null {
    const value = request.headers.authorization;
    const match = typeof value === 'string' ? /^Bearer ([^\s]+)$/.exec(value) : null;
    return match?.[1] ?? null;
  }
}
