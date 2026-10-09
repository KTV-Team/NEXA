import type { ApiResponse } from '@nexa/types';
import { ApiClientError } from './errors';
import type { AuthClientType } from '@nexa/types';

export interface ApiClientConfig {
  baseUrl: string;
  getAccessToken?: () => string | null | Promise<string | null>;
  onUnauthorized?: (accessToken: string | null) => void;
  timeoutMs?: number;
  authClient?: AuthClientType;
}

export type ApiRequest = <T>(method: string, path: string, body?: unknown) => Promise<T>;

export function createTransport(config: ApiClientConfig): ApiRequest {
  const baseUrl = config.baseUrl.replace(/\/$/, '');
  const getAccessToken = config.getAccessToken ?? (() => null);
  const timeoutMs = config.timeoutMs ?? 15000;
  const authClient = config.authClient ?? 'mobile';

  return async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const token = await getAccessToken();
    const headers: Record<string, string> = { 'X-Auth-Client': authClient };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = `Bearer ${token}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers,
        credentials: authClient === 'web' ? 'include' : 'omit',
        signal: controller.signal,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      if (response.status === 401 && !path.startsWith('/auth/')) {
        config.onUnauthorized?.(token);
      }

      if (response.ok && response.status === 204) return undefined as T;

      let json: ApiResponse<T>;
      try {
        json = (await response.json()) as ApiResponse<T>;
      } catch {
        throw new ApiClientError(response.status, 'INVALID_RESPONSE', 'API response must be JSON.');
      }

      if (!json || typeof json !== 'object') {
        throw new ApiClientError(response.status, 'INVALID_RESPONSE', 'Invalid API response.');
      }

      if (response.ok && typeof json.success !== 'boolean') {
        throw new ApiClientError(
          response.status,
          'INVALID_RESPONSE',
          'API response is missing its success flag.',
        );
      }

      if (!response.ok || !json.success) {
        throw new ApiClientError(
          response.status,
          json.error?.code ?? 'UNKNOWN_ERROR',
          json.error?.message ?? 'An unexpected error occurred',
          json.error?.details,
        );
      }

      if (!('data' in json)) {
        throw new ApiClientError(
          response.status,
          'INVALID_RESPONSE',
          'API response is missing data.',
        );
      }
      return json.data as T;
    } catch (error) {
      if (controller.signal.aborted) {
        throw new ApiClientError(0, 'TIMEOUT', 'The request timed out.');
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };
}
