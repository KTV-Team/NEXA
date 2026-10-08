import { ApiClientError, createApiClient } from '@nexa/api-client';
import type { AuthResponse, LoginDto, RegisterDto, UpdateUserDto } from '@nexa/types';
import { z } from '@nexa/validation';

const sessionSchema = z.object({
  user: z.object({
    id: z.string().min(1),
    email: z.string().email(),
    name: z.string(),
    role: z.enum(['admin', 'user', 'guest']),
    avatarUrl: z.string().optional(),
    createdAt: z.string(),
    updatedAt: z.string(),
  }),
  tokens: z.object({
    accessToken: z.string().min(1),
    refreshToken: z.string().min(1),
    expiresIn: z.number().positive().finite(),
  }),
  expiresAt: z.number().positive().finite(),
});

export type AuthSession = z.infer<typeof sessionSchema>;
export interface SessionStorage {
  read(): Promise<string | null>;
  write(value: string): Promise<void>;
  remove(): Promise<void>;
}

/** Owns transport and persistence, independently of navigation or rendering. */
export class AuthService {
  private session: AuthSession | null = null;
  private remember = false;
  private refreshRequest: Promise<string> | null = null;
  private readonly transport;
  readonly api;

  constructor(
    baseUrl: string,
    private readonly storage: SessionStorage,
  ) {
    this.transport = createApiClient({
      baseUrl,
      getAccessToken: () => this.session?.tokens.accessToken ?? null,
    });
    this.api = createApiClient({ baseUrl, getAccessToken: () => this.accessToken() });
  }

  private async save(
    response: AuthResponse,
    expiresAt = Date.now() + (response?.tokens?.expiresIn ?? 0) * 1000,
  ): Promise<AuthSession> {
    const result = sessionSchema.safeParse({
      ...response,
      expiresAt,
    });
    if (!result.success)
      throw new ApiClientError(0, 'INVALID_RESPONSE', 'Invalid authentication response.');
    const session = result.data;
    try {
      if (this.remember) await this.storage.write(JSON.stringify(session));
      else await this.storage.remove();
    } catch {
      throw new ApiClientError(0, 'STORAGE_UNAVAILABLE', 'Cannot save the session.');
    }
    this.session = session;
    return session;
  }

  async restore(): Promise<AuthSession | null> {
    const value = await this.storage.read();
    if (!value) return null;
    try {
      this.session = sessionSchema.parse(JSON.parse(value));
    } catch {
      await this.clear();
      return null;
    }
    this.remember = true;
    try {
      await this.accessToken();
      const user = await this.api.users.me();
      return await this.save({ user, tokens: this.session!.tokens }, this.session!.expiresAt);
    } catch (error) {
      // Retain the saved token for an explicit retry after a network outage.
      if (
        error instanceof ApiClientError &&
        (error.statusCode === 401 || error.statusCode === 403)
      ) {
        await this.clear();
        return null;
      }
      this.session = null;
      throw error;
    }
  }

  async login(values: LoginDto, remember: boolean): Promise<AuthSession> {
    this.remember = remember;
    return this.save(await this.transport.auth.login(values));
  }

  async register(values: RegisterDto, remember = true): Promise<AuthSession> {
    this.remember = remember;
    return this.save(await this.transport.auth.register(values));
  }

  async updateProfile(values: UpdateUserDto): Promise<AuthSession> {
    const startingSession = this.session;
    if (!startingSession)
      throw new ApiClientError(401, 'SESSION_EXPIRED', 'Session ended.');

    const user = await this.api.users.update(values);
    const currentSession = this.session;
    if (!currentSession || currentSession.user.id !== startingSession.user.id)
      throw new ApiClientError(401, 'SESSION_EXPIRED', 'Session ended.');

    return this.save(
      { user, tokens: currentSession.tokens },
      currentSession.expiresAt,
    );
  }

  private async accessToken(): Promise<string | null> {
    if (!this.session) return null;
    if (this.session.expiresAt > Date.now() + 30000) return this.session.tokens.accessToken;
    if (!this.refreshRequest) {
      const current = this.session;
      this.refreshRequest = this.transport.auth
        .refresh(current.tokens.refreshToken)
        .then(async (tokens) => {
          // A logout during a request must never recreate a session.
          if (this.session !== current)
            throw new ApiClientError(401, 'SESSION_EXPIRED', 'Session ended.');
          await this.save({ user: current.user, tokens });
          return tokens.accessToken;
        })
        .finally(() => {
          this.refreshRequest = null;
        });
    }
    return this.refreshRequest;
  }

  async logout(): Promise<void> {
    try {
      if (this.session) await this.transport.auth.logout(this.session.tokens.refreshToken);
    } finally {
      await this.clear();
    }
  }

  private async clear(): Promise<void> {
    this.session = null;
    this.remember = false;
    await this.storage.remove();
  }
}
