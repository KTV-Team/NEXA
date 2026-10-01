import type {
  ApiResponse,
  AuthResponse,
  AuthTokens,
  HealthStatus,
  LoginDto,
  PaginatedResponse,
  UpdateUserDto,
  User,
} from '@nexa/types';

// ─────────────────────────────────────────────────────────────────────────────
// Client configuration
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP error
// ─────────────────────────────────────────────────────────────────────────────

export class ApiClientError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Core client
// ─────────────────────────────────────────────────────────────────────────────

export class ApiClient {
  private readonly baseUrl: string;
  private readonly getAccessToken: () => string | null | Promise<string | null>;
  private readonly onUnauthorized: (() => void) | undefined;

  constructor(config: ApiClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.getAccessToken = config.getAccessToken ?? (() => null);
    this.onUnauthorized = config.onUnauthorized;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
  ): Promise<T> {
    const token = await this.getAccessToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (response.status === 401) {
      this.onUnauthorized?.();
    }

    const json = (await response.json()) as ApiResponse<T>;

    if (!response.ok || !json.success) {
      throw new ApiClientError(
        response.status,
        json.error?.code ?? 'UNKNOWN_ERROR',
        json.error?.message ?? 'An unexpected error occurred',
        json.error?.details,
      );
    }

    return json.data as T;
  }

  // ── Auth ──────────────────────────────────────────────────────────────────

  auth = {
    login: (dto: LoginDto): Promise<AuthResponse> =>
      this.request('POST', '/auth/login', dto),

    logout: (): Promise<void> => this.request('POST', '/auth/logout'),

    refresh: (refreshToken: string): Promise<AuthTokens> =>
      this.request('POST', '/auth/refresh', { refreshToken }),
  };

  // ── Users ─────────────────────────────────────────────────────────────────

  users = {
    me: (): Promise<User> => this.request('GET', '/users/me'),

    update: (dto: UpdateUserDto): Promise<User> =>
      this.request('PATCH', '/users/me', dto),

    list: (params?: {
      page?: number;
      limit?: number;
    }): Promise<PaginatedResponse<User>> => {
      const qs = new URLSearchParams(
        Object.entries(params ?? {}).map(([k, v]) => [k, String(v)]),
      ).toString();
      return this.request('GET', `/users${qs ? `?${qs}` : ''}`);
    },

    getById: (id: string): Promise<User> =>
      this.request('GET', `/users/${id}`),
  };

  // ── Health ────────────────────────────────────────────────────────────────

  health = {
    check: (): Promise<HealthStatus> => this.request('GET', '/health'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory helper
// ─────────────────────────────────────────────────────────────────────────────

export function createApiClient(config: ApiClientConfig): ApiClient {
  return new ApiClient(config);
}

export type { ApiResponse, AuthResponse, AuthTokens, HealthStatus, User };
