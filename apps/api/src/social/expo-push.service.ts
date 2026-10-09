import { Injectable } from '@nestjs/common';
import { appEnvironment } from '../config/environment';

export interface ExpoMessage {
  to: string;
  title: string;
  body: string;
  sound: 'default';
  priority: 'high';
  channelId: 'default';
  data: { itemId: string; occurrenceId: string };
}

export type ExpoTicket =
  | { status: 'ok'; id: string }
  | { status: 'error'; code: string; retryable: boolean };

export class ExpoRequestError extends Error {
  constructor(readonly code: string, readonly retryable: boolean) {
    super(code);
  }
}

function record(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function errorCode(value: unknown): string {
  return record(value) && typeof value['error'] === 'string' ? value['error'].slice(0, 64) : 'EXPO_REJECTED';
}

export function truncateUtf8(value: string, maxBytes: number): string {
  let output = '';
  let used = 0;
  for (const character of value) {
    const size = Buffer.byteLength(character, 'utf8');
    if (used + size > maxBytes - 3) return `${output}…`;
    output += character;
    used += size;
  }
  return output;
}

@Injectable()
export class ExpoPushService {
  private readonly endpoint = 'https://exp.host/--/api/v2/push';

  message(input: { token: string; title: string; body: string; itemId: string; occurrenceId: string }): ExpoMessage {
    return {
      to: input.token,
      title: truncateUtf8(input.title, 512),
      body: truncateUtf8(input.body, 2400),
      sound: 'default',
      priority: 'high',
      channelId: 'default',
      data: { itemId: input.itemId, occurrenceId: input.occurrenceId },
    };
  }

  async send(messages: ExpoMessage[]): Promise<ExpoTicket[]> {
    const body = await this.request('/send', messages);
    if (!record(body) || !Array.isArray(body['data'])) throw new ExpoRequestError('EXPO_BAD_RESPONSE', true);
    return body['data'].map((ticket): ExpoTicket => {
      if (record(ticket) && ticket['status'] === 'ok' && typeof ticket['id'] === 'string') {
        return { status: 'ok', id: ticket['id'] };
      }
      if (record(ticket) && ticket['status'] === 'error') {
        const code = errorCode(ticket['details']);
        const retryable = ['MessageRateExceeded', 'TOO_MANY_REQUESTS', 'SERVER_ERROR'].includes(code);
        return { status: 'error', code, retryable };
      }
      return { status: 'error', code: 'EXPO_BAD_TICKET', retryable: true };
    });
  }

  async receipts(ids: string[]): Promise<Record<string, { status: 'ok' | 'error'; code?: string }>> {
    const body = await this.request('/getReceipts', { ids });
    if (!record(body) || !record(body['data'])) throw new ExpoRequestError('EXPO_BAD_RECEIPT_RESPONSE', true);
    const receipts: Record<string, { status: 'ok' | 'error'; code?: string }> = {};
    for (const [id, receipt] of Object.entries(body['data'])) {
      if (record(receipt) && receipt['status'] === 'ok') receipts[id] = { status: 'ok' };
      else if (record(receipt) && receipt['status'] === 'error') {
        receipts[id] = { status: 'error', code: errorCode(receipt['details']) };
      }
    }
    return receipts;
  }

  private async request(path: string, payload: unknown): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${this.endpoint}${path}`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          ...(appEnvironment.EXPO_ACCESS_TOKEN ? { authorization: `Bearer ${appEnvironment.EXPO_ACCESS_TOKEN}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      let result: unknown;
      try { result = await response.json(); } catch { throw new ExpoRequestError('EXPO_BAD_RESPONSE', response.status >= 500); }
      if (!response.ok) {
        const retryable = response.status === 429 || response.status >= 500;
        throw new ExpoRequestError(`EXPO_HTTP_${response.status}`, retryable);
      }
      return result;
    } catch (failure) {
      if (failure instanceof ExpoRequestError) throw failure;
      throw new ExpoRequestError('EXPO_NETWORK_ERROR', true);
    } finally {
      clearTimeout(timeout);
    }
  }
}
