import { AddressInfo } from 'node:net';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io as Client, type Socket } from 'socket.io-client';
import { createChatServer } from '../../src/server/chatServer.js';
import type { ChatMessage, RoomState, SystemEvent } from '../../src/shared/chat.js';

function once<T>(socket: Socket, event: string) {
  return new Promise<T>((resolve) => {
    socket.once(event, resolve);
  });
}

describe('chat socket', () => {
  let server: ReturnType<typeof createChatServer>;
  let url: string;
  const clients: Socket[] = [];

  beforeEach(async () => {
    server = createChatServer('*');
    await new Promise<void>((resolve) => server.httpServer.listen(0, '127.0.0.1', resolve));
    const address = server.httpServer.address() as AddressInfo;
    url = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    clients.forEach((client) => client.close());
    clients.length = 0;
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
  });

  async function connectClient() {
    const client = Client(url, { autoConnect: false, transports: ['websocket'] });
    clients.push(client);
    const connected = once(client, 'connect');
    const initialState = once<RoomState>(client, 'room:state');
    client.connect();
    await Promise.all([connected, initialState]);
    return client;
  }

  it('joins users, broadcasts messages, and updates presence on disconnect', async () => {
    const ada = await connectClient();
    const grace = await connectClient();

    ada.emit('join', { name: 'Ada' });
    await once<RoomState>(ada, 'room:state');

    const adaSawJoin = once<SystemEvent>(ada, 'user:joined');
    grace.emit('join', { name: 'Grace' });
    expect((await adaSawJoin).user.name).toBe('Grace');

    const messageForAda = once<ChatMessage>(ada, 'message:new');
    const messageForGrace = once<ChatMessage>(grace, 'message:new');
    ada.emit('message:send', { body: '  hello  ' });

    expect(await messageForAda).toMatchObject({ userName: 'Ada', body: 'hello' });
    expect(await messageForGrace).toMatchObject({ userName: 'Ada', body: 'hello' });

    const graceSawLeave = once<SystemEvent>(grace, 'user:left');
    ada.close();
    expect((await graceSawLeave).user.name).toBe('Ada');
  });
});
