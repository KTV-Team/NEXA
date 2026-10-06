// ─────────────────────────────────────────────────────────────────────────────
// Common
// ─────────────────────────────────────────────────────────────────────────────

export type ID = string;

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// User
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'user' | 'guest';

export interface User {
  id: ID;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface CreateUserDto {
  email: string;
  name: string;
  password: string;
  role?: UserRole;
}

export interface UpdateUserDto {
  name?: string;
  avatarUrl?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Auth
// ─────────────────────────────────────────────────────────────────────────────

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
  expiresIn: number; // seconds
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ─────────────────────────────────────────────────────────────────────────────
// Health
// ─────────────────────────────────────────────────────────────────────────────

export interface HealthStatus {
  status: 'ok' | 'error';
  timestamp: string;
  version: string;
}
