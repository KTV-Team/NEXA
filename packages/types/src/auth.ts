import type { User } from './users';

export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto extends LoginDto {
  name: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

export type AuthClientType = 'mobile' | 'web';

export interface WebAuthTokens {
  accessToken: string;
  expiresIn: number;
}

export interface WebAuthResponse {
  user: User;
  tokens: WebAuthTokens;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}
