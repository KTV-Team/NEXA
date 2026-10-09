import type { DataSource } from 'typeorm';
import { WebSocket as WebSocketConnection } from 'ws';
import type { WebSocket } from 'ws';
import type { AuthService } from '../../src/auth/auth.service';
import { InboxRealtimeGateway } from '../../src/social/inbox-realtime.gateway';

describe('inbox realtime gateway', () => {
  it('sends each event only to its authenticated recipient', async () => {
    const auth = {
      authenticateAccessToken: jest.fn(async (token: string) => ({
        userId: token === 'alice-token' ? 'alice' : 'bob',
        sessionId: token === 'alice-token' ? 'alice-session' : 'bob-session',
        expiresAt: Date.now() + 60_000,
      })),
      isSessionActive: jest.fn().mockResolvedValue(true),
    } as unknown as AuthService;
    const db = {
      query: jest.fn().mockResolvedValue([{
        id: 'event-1',
        recipient_id: 'alice',
        kind: 'updated',
        item_id: 'item-1',
      }]),
    } as unknown as DataSource;
    const gateway = new InboxRealtimeGateway(auth, db);
    const aliceSend = jest.fn();
    const bobSend = jest.fn();
    const alice = {
      readyState: WebSocketConnection.OPEN,
      send: aliceSend,
      close: jest.fn(),
    } as unknown as WebSocket;
    const bob = {
      readyState: WebSocketConnection.OPEN,
      send: bobSend,
      close: jest.fn(),
    } as unknown as WebSocket;

    Object.defineProperty(gateway, 'server', {
      value: { clients: new Set([alice, bob]) },
      configurable: true,
    });
    gateway.handleConnection(alice);
    gateway.handleConnection(bob);

    try {
      await gateway.authenticate(alice, { accessToken: 'alice-token' });
      await gateway.authenticate(bob, { accessToken: 'bob-token' });
      aliceSend.mockClear();
      bobSend.mockClear();

      await gateway.publish('event-1');

      expect(aliceSend).toHaveBeenCalledTimes(1);
      expect(JSON.parse(aliceSend.mock.calls[0][0] as string)).toEqual({
        eventId: 'event-1',
        kind: 'updated',
        itemId: 'item-1',
      });
      expect(bobSend).not.toHaveBeenCalled();
      expect(auth.isSessionActive).toHaveBeenCalledWith({ userId: 'alice', sessionId: 'alice-session' });
    } finally {
      gateway.handleDisconnect(alice);
      gateway.handleDisconnect(bob);
    }
  });

  it('closes a connection when access-token authentication fails', async () => {
    const auth = {
      authenticateAccessToken: jest.fn().mockRejectedValue(new Error('invalid token')),
      isSessionActive: jest.fn(),
    } as unknown as AuthService;
    const db = { query: jest.fn() } as unknown as DataSource;
    const gateway = new InboxRealtimeGateway(auth, db);
    const close = jest.fn();
    const client = {
      readyState: WebSocketConnection.OPEN,
      send: jest.fn(),
      close,
    } as unknown as WebSocket;

    gateway.handleConnection(client);
    try {
      await gateway.authenticate(client, { accessToken: 'invalid-token' });
      expect(close).toHaveBeenCalledWith(4401, 'Invalid authentication');
    } finally {
      gateway.handleDisconnect(client);
    }
  });
});
