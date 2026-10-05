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

export type SystemRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN';
export type TeamRole = 'OWNER' | 'ADMIN' | 'MEMBER';

export interface User {
  id: ID;
  email: string;
  name: string;
  systemRole: SystemRole;
  avatarUrl?: string;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

export interface CreateUserDto {
  email: string;
  name: string;
  password: string;
}

export interface DevDemoData {
  database: 'connected';
  users: Array<{ id: ID; name: string; systemRole: SystemRole }>;
  teams: Array<{
    id: ID;
    name: string;
    members: Array<{ userId: ID; role: TeamRole }>;
  }>;
  counts: { todoItems: number; events: number; notifications: number };
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
