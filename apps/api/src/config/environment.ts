import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { config as loadDotEnv, parse as parseDotEnv } from 'dotenv';

export type NodeEnvironment = 'development' | 'test' | 'production';

export interface AppEnvironment {
  NODE_ENV: NodeEnvironment;
  PORT: number;
  CORS_ORIGIN: string[];
  AUTH_WEB_ORIGINS: string[];
  AUTH_ACCESS_SECRET: string;
  DB_HOST: string;
  DB_PORT: number;
  DB_NAME: string;
  DB_USER: string;
  DB_PASSWORD: string;
  DB_SSL: boolean;
  ALLOW_DEV_SEED: boolean;
  NOTIFICATION_WORKER_ENABLED: boolean;
  EXPO_ACCESS_TOKEN?: string;
  DEV_SEED_PASSWORD?: string;
}

export const appEnvironment = loadEnvironment();

export function loadEnvironment(): AppEnvironment {
  const appRoot = resolve(__dirname, '../../');
  const defaultEnv = resolve(appRoot, '.env');
  const preview = process.env['NODE_ENV']
    ? undefined
    : existsSync(defaultEnv)
      ? parseDotEnv(readFileSync(defaultEnv))
      : undefined;
  const modeHint = process.env['NODE_ENV'] ?? preview?.['NODE_ENV'];
  if (modeHint !== 'production') {
    const filename = modeHint === 'test' ? '.env.test' : '.env';
    const envPath = resolve(appRoot, filename);
    if (existsSync(envPath)) loadDotEnv({ path: envPath, override: false });
  }

  const mode = process.env['NODE_ENV'];
  if (mode !== 'development' && mode !== 'test' && mode !== 'production') {
    throw new Error('NODE_ENV must be development, test, or production');
  }

  const required = (key: string): string => {
    const value = process.env[key]?.trim();
    if (!value) throw new Error(`${key} is required`);
    return value;
  };
  const port = (key: string, fallback: string): number => {
    const value = Number(process.env[key] ?? fallback);
    if (!Number.isInteger(value) || value < 1 || value > 65535) {
      throw new Error(`${key} must be a valid TCP port`);
    }
    return value;
  };
  const bool = (key: string, fallback: boolean): boolean => {
    const value = process.env[key];
    if (value === undefined) return fallback;
    if (value === 'true') return true;
    if (value === 'false') return false;
    throw new Error(`${key} must be true or false`);
  };

  const cors = process.env['CORS_ORIGIN'] ?? 'http://localhost:3000';
  const origins = cors
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (origins.length === 0) throw new Error('CORS_ORIGIN must contain an origin');
  const webOrigins = (process.env['AUTH_WEB_ORIGINS'] ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  const authSecret = process.env['AUTH_ACCESS_SECRET']?.trim() ?? '';
  let decodedSecret: Buffer;
  try {
    decodedSecret = Buffer.from(authSecret, 'base64');
  } catch {
    decodedSecret = Buffer.alloc(0);
  }
  if (
    decodedSecret.length < 32 ||
    decodedSecret.toString('base64').replace(/=+$/, '') !== authSecret.replace(/=+$/, '')
  ) {
    throw new Error('AUTH_ACCESS_SECRET must be base64 for at least 32 random bytes');
  }
  if (mode === 'production' && webOrigins.some((origin) => !origin.startsWith('https://'))) {
    throw new Error('AUTH_WEB_ORIGINS must use HTTPS in production');
  }

  return {
    NODE_ENV: mode,
    PORT: port('PORT', '4000'),
    CORS_ORIGIN: origins,
    AUTH_WEB_ORIGINS: webOrigins,
    AUTH_ACCESS_SECRET: authSecret,
    DB_HOST: required('DB_HOST'),
    DB_PORT: port('DB_PORT', '5432'),
    DB_NAME: required('DB_NAME'),
    DB_USER: required('DB_USER'),
    DB_PASSWORD: required('DB_PASSWORD'),
    DB_SSL: bool('DB_SSL', false),
    ALLOW_DEV_SEED: bool('ALLOW_DEV_SEED', false),
    NOTIFICATION_WORKER_ENABLED: bool('NOTIFICATION_WORKER_ENABLED', mode !== 'test'),
    EXPO_ACCESS_TOKEN: process.env['EXPO_ACCESS_TOKEN']?.trim() || undefined,
    DEV_SEED_PASSWORD: process.env['DEV_SEED_PASSWORD'],
  };
}
