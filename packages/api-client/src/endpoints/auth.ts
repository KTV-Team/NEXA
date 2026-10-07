import type {
  AuthClientType,
  AuthResponse,
  AuthTokens,
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  WebAuthResponse,
  WebAuthTokens,
} from '@nexa/types';
import type { ApiRequest } from '../transport';

export type AuthEndpoints<T extends AuthClientType> = T extends 'web'
  ? {
      register: (dto: RegisterDto) => Promise<WebAuthResponse>;
      login: (dto: LoginDto) => Promise<WebAuthResponse>;
      logout: () => Promise<void>;
      refresh: () => Promise<WebAuthTokens>;
      changePassword: (dto: ChangePasswordDto) => Promise<void>;
    }
  : {
      register: (dto: RegisterDto) => Promise<AuthResponse>;
      login: (dto: LoginDto) => Promise<AuthResponse>;
      logout: (refreshToken?: string) => Promise<void>;
      refresh: (refreshToken: string) => Promise<AuthTokens>;
      changePassword: (dto: ChangePasswordDto) => Promise<void>;
    };

export function createAuthEndpoints<T extends AuthClientType>(
  request: ApiRequest,
  _client: T,
): AuthEndpoints<T> {
  void _client;
  const endpoints = {
    register: (dto: RegisterDto) => request('POST', '/auth/register', dto),
    login: (dto: LoginDto) => request('POST', '/auth/login', dto),
    logout: (refreshToken?: string) =>
      request('POST', '/auth/logout', refreshToken ? { refreshToken } : undefined),
    refresh: (refreshToken?: string) =>
      request('POST', '/auth/refresh', refreshToken ? { refreshToken } : {}),
    changePassword: (dto: ChangePasswordDto) => request('POST', '/auth/change-password', dto),
  };
  return endpoints as AuthEndpoints<T>;
}
