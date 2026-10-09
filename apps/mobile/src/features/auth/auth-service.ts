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
  private restoreRequest: Promise<AuthSession | null> | null = null;
  private generation = 0;
  private storageTask: Promise<void> = Promise.resolve();
  private onSessionEnded: ((error?: ApiClientError) => void) | null = null;
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
    this.api = createApiClient({
      baseUrl,
      getAccessToken: () => this.accessToken(),
      onUnauthorized: (token) => {
        if (token && this.session?.tokens.accessToken === token)
          void this.clear().catch(() => undefined);
      },
    });
  }

  setSessionEndedListener(listener: ((error?: ApiClientError) => void) | null): void {
    this.onSessionEnded = listener;
  }

  private persist(operation: () => Promise<void>): Promise<void> {
    const next = this.storageTask.catch(() => undefined).then(operation);
    this.storageTask = next;
    return next;
  }

  private async save(
    response: AuthResponse,
    expiresAt = Date.now() + (response?.tokens?.expiresIn ?? 0) * 1000,
    expectedGeneration = this.generation,
  ): Promise<AuthSession> {
    const result = sessionSchema.safeParse({
      ...response,
      expiresAt,
    });
    if (!result.success)
      throw new ApiClientError(0, 'INVALID_RESPONSE', 'Invalid authentication response.');
    const session = result.data;
    if (expectedGeneration !== this.generation)
      throw new ApiClientError(401, 'SESSION_EXPIRED', 'Session ended.');
    try {
      await this.persist(async () => {
        if (expectedGeneration !== this.generation) return;
        if (this.remember) await this.storage.write(JSON.stringify(session));
        else await this.storage.remove();
      });
    } catch {
      throw new ApiClientError(0, 'STORAGE_UNAVAILABLE', 'Cannot save the session.');
    }
    if (expectedGeneration !== this.generation)
      throw new ApiClientError(401, 'SESSION_EXPIRED', 'Session ended.');
    this.session = session;
    return session;
  }

  restore(): Promise<AuthSession | null> {
    if (!this.restoreRequest) {
      const request = this.restoreOnce().finally(() => {
        if (this.restoreRequest === request) this.restoreRequest = null;
      });
      this.restoreRequest = request;
    }
    return this.restoreRequest;
  }

  private async restoreOnce(): Promise<AuthSession | null> {
    const generation = this.generation;
    const value = await this.storage.read();
    if (generation !== this.generation) return this.session;
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
      if (!this.session) return null;
      return await this.save({ user, tokens: this.session.tokens }, this.session.expiresAt, generation);
    } catch (error) {
      if (generation !== this.generation) return this.session;
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
    const generation = ++this.generation;
    this.refreshRequest = null;
    this.restoreRequest = null;
    this.remember = remember;
    return this.save(await this.transport.auth.login(values), undefined, generation);
  }

  async register(values: RegisterDto, remember = true): Promise<AuthSession> {
    const generation = ++this.generation;
    this.refreshRequest = null;
    this.restoreRequest = null;
    this.remember = remember;
    return this.save(await this.transport.auth.register(values), undefined, generation);
  }

  async updateProfile(values: UpdateUserDto): Promise<AuthSession> {
    const startingSession = this.session;
    const generation = this.generation;
    if (!startingSession)
      throw new ApiClientError(401, 'SESSION_EXPIRED', 'Session ended.');

    const user = await this.api.users.update(values);
    const currentSession = this.session;
    if (!currentSession || currentSession.user.id !== startingSession.user.id)
      throw new ApiClientError(401, 'SESSION_EXPIRED', 'Session ended.');

    return this.save(
      { user, tokens: currentSession.tokens },
      currentSession.expiresAt,
      generation,
    );
  }

  async refreshProfile(): Promise<AuthSession> {
    const startingSession = this.session;
    const generation = this.generation;
    if (!startingSession)
      throw new ApiClientError(401, 'SESSION_EXPIRED', 'Session ended.');
    const user = await this.api.users.me();
    const currentSession = this.session;
    if (!currentSession || currentSession.user.id !== startingSession.user.id)
      throw new ApiClientError(401, 'SESSION_EXPIRED', 'Session ended.');
    return this.save({ user, tokens: currentSession.tokens }, currentSession.expiresAt, generation);
  }

  private async accessToken(): Promise<string | null> {
    if (!this.session) return null;
    if (this.session.expiresAt > Date.now() + 30000) return this.session.tokens.accessToken;
    if (!this.refreshRequest) {
      const current = this.session;
      const generation = this.generation;
      this.refreshRequest = this.transport.auth
        .refresh(current.tokens.refreshToken)
        .then(async (tokens) => {
          // A logout during a request must never recreate a session.
          if (this.session !== current || generation !== this.generation)
            throw new ApiClientError(401, 'SESSION_EXPIRED', 'Session ended.');
          await this.save({ user: current.user, tokens }, undefined, generation);
          return tokens.accessToken;
        })
        .catch(async (error: unknown) => {
          if (error instanceof ApiClientError && error.statusCode === 401 && generation === this.generation)
            await this.clear();
          throw error;
        })
        .finally(() => {
          if (this.generation === generation) this.refreshRequest = null;
        });
    }
    return this.refreshRequest;
  }

  async logout(): Promise<void> {
    const token = this.session?.tokens.refreshToken;
    await this.clear();
    if (token) await this.transport.auth.logout(token);
  }

  private async clear(): Promise<void> {
    ++this.generation;
    this.refreshRequest = null;
    this.restoreRequest = null;
    this.session = null;
    this.remember = false;
    this.onSessionEnded?.();
    try {
      await this.persist(() => this.storage.remove());
    } catch {
      const error = new ApiClientError(0, 'STORAGE_UNAVAILABLE', 'Cannot clear the session.');
      this.onSessionEnded?.(error);
      throw error;
    }
  }
}
