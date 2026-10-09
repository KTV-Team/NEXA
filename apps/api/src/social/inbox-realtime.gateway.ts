import { ConnectedSocket, MessageBody, OnGatewayConnection, OnGatewayDisconnect, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { Client } from 'pg';
import { WebSocket as WebSocketConnection } from 'ws';
import type { Server, WebSocket } from 'ws';
import { appEnvironment } from '../config/environment';
import type { AuthIdentity } from '../auth/auth-request';
import { AuthService } from '../auth/auth.service';
import { DataSource } from 'typeorm';

interface AuthMessage { accessToken: string }
function isAuthMessage(value: unknown): value is AuthMessage {
  if (!value || typeof value !== 'object') return false;
  const token = (value as Record<string, unknown>)['accessToken'];
  return typeof token === 'string' && token.length > 0 && token.length <= 8192;
}

@Injectable()
@WebSocketGateway({ path: '/api/v1/inbox/events' })
export class InboxRealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(InboxRealtimeGateway.name);
  private readonly identities = new WeakMap<WebSocket, AuthIdentity>();
  private readonly authTimers = new WeakMap<WebSocket, NodeJS.Timeout>();
  private listener?: Client;
  private reconnectTimer?: NodeJS.Timeout;
  private reconnectScheduled = false;

  @WebSocketServer() private server?: Server;

  constructor(private readonly auth: AuthService, private readonly db: DataSource) {}

  onModuleInit(): void {
    if (appEnvironment.NODE_ENV === 'test') return;
    void this.connectListener();
  }

  async onModuleDestroy(): Promise<void> {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    const listener = this.listener;
    this.listener = undefined;
    if (listener) await listener.end().catch(() => undefined);
  }

  handleConnection(client: WebSocket): void {
    const timer = setTimeout(() => client.close(4401, 'Authentication required'), 5000);
    timer.unref();
    this.authTimers.set(client, timer);
  }

  handleDisconnect(client: WebSocket): void {
    const timer = this.authTimers.get(client);
    if (timer) clearTimeout(timer);
    this.authTimers.delete(client);
    this.identities.delete(client);
  }

  @SubscribeMessage('authenticate')
  async authenticate(@ConnectedSocket() client: WebSocket, @MessageBody() payload: unknown): Promise<void> {
    if (this.identities.has(client) || !isAuthMessage(payload)) {
      client.close(4401, 'Invalid authentication');
      return;
    }
    try {
      const identity = await this.auth.authenticateAccessToken(payload.accessToken);
      this.identities.set(client, { userId: identity.userId, sessionId: identity.sessionId });
      const timer = this.authTimers.get(client);
      if (timer) clearTimeout(timer);
      const expiresIn = Math.max(0, identity.expiresAt - Date.now());
      const expiryTimer = setTimeout(() => client.close(4401, 'Session expired'), expiresIn);
      expiryTimer.unref();
      this.authTimers.set(client, expiryTimer);
      this.send(client, { eventId: randomUUID(), kind: 'resync' });
    } catch {
      client.close(4401, 'Invalid authentication');
    }
  }

  async publish(eventId: string): Promise<void> {
    if (!this.server) return;
    const [event] = await this.db.query(
      'SELECT id,recipient_id,kind,item_id FROM inbox_event_outbox WHERE id=$1',
      [eventId],
    );
    if (!event) return;
    const payload = {
      eventId: event.id as string,
      kind: event.kind as 'created' | 'updated' | 'deleted' | 'resync',
      ...(event.item_id ? { itemId: event.item_id as string } : {}),
    };
    await Promise.all([...this.server.clients].map(async (client) => {
      if (client.readyState !== WebSocketConnection.OPEN) return;
      const identity = this.identities.get(client);
      if (!identity || identity.userId !== event.recipient_id) return;
      if (!(await this.auth.isSessionActive(identity))) {
        client.close(4401, 'Session revoked');
        return;
      }
      this.send(client, payload);
    }));
  }

  resyncAll(): void {
    if (!this.server) return;
    const payload = { eventId: randomUUID(), kind: 'resync' as const };
    for (const client of this.server.clients) {
      if (client.readyState === WebSocketConnection.OPEN && this.identities.has(client)) this.send(client, payload);
    }
  }

  private send(client: WebSocket, payload: object): void {
    if (client.readyState === WebSocketConnection.OPEN) client.send(JSON.stringify(payload));
  }

  private async connectListener(): Promise<void> {
    if (this.listener || this.reconnectScheduled) return;
    const listener = new Client({
      host: appEnvironment.DB_HOST,
      port: appEnvironment.DB_PORT,
      database: appEnvironment.DB_NAME,
      user: appEnvironment.DB_USER,
      password: appEnvironment.DB_PASSWORD,
      ssl: appEnvironment.DB_SSL ? { rejectUnauthorized: true } : false,
    });
    listener.on('notification', (message) => {
      if (message.channel !== 'nexa_inbox_events' || !message.payload) return;
      void this.publish(message.payload).catch(() => {
        this.logger.warn('Inbox event delivery failed; clients will resync on reconnect.');
      });
    });
    listener.on('error', () => this.scheduleReconnect(listener));
    listener.on('end', () => this.scheduleReconnect(listener));
    try {
      await listener.connect();
      await listener.query('LISTEN nexa_inbox_events');
      this.listener = listener;
      this.resyncAll();
    } catch {
      await listener.end().catch(() => undefined);
      this.scheduleReconnect(listener);
    }
  }

  private scheduleReconnect(listener: Client): void {
    if (this.listener === listener) this.listener = undefined;
    if (this.reconnectScheduled || appEnvironment.NODE_ENV === 'test') return;
    this.reconnectScheduled = true;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectScheduled = false;
      void this.connectListener();
    }, 5000);
    this.reconnectTimer.unref();
  }
}
