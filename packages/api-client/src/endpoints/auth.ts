import type { AuthResponse, AuthTokens, LoginDto, RegisterDto } from '@nexa/types';
import type { ApiRequest } from '../transport';

export function createAuthEndpoints(request: ApiRequest) {
  return {
    register: (dto: RegisterDto): Promise<AuthResponse> => request('POST', '/auth/register', dto),
    login: (dto: LoginDto): Promise<AuthResponse> => request('POST', '/auth/login', dto),
    logout: (): Promise<void> => request('POST', '/auth/logout'),
    refresh: (refreshToken: string): Promise<AuthTokens> =>
      request('POST', '/auth/refresh', { refreshToken }),
  };
}
