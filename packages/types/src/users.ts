import type { ID } from './common';

/** Scaffold role only; privileged product roles are not confirmed. */
export type UserRole = 'admin' | 'user' | 'guest';

export interface User {
  id: ID;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
  updatedAt: string;
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
