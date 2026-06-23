import { mkdtempSync, rmSync } from 'node:fs';
import { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { io as Client, type Socket } from 'socket.io-client';
import { createChatServer } from '../../src/server/chatServer.js';
import { createSqliteMessageStore } from '../../src/server/messageStore.js';
import type {
  ChatMessage,
  RoomState,
  ServerErrorPayload,
  SystemEvent,
  TypingUpdatePayload
} from '../../src/shared/chat.js';

function once<T>(socket: Socket, event: string) {
  return new Promise<T>((resolve) => {
    socket.once(event, resolve);
  });
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

describe('chat socket', () => {
  let server: ReturnType<typeof createChatServer>;
  let tempDir: string;
  let dbPath: string;
  let url: string;
  const clients: Socket[] = [];

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-chat-socket-'));
    dbPath = join(tempDir, 'chat.sqlite');
    server = createChatServer({
      clientOrigin: '*',
      messageStore: createSqliteMessageStore(dbPath),
      messageRateLimit: {
        maxMessages: 5,
        windowMs: 80
      }
    });
    await new Promise<void>((resolve) => server.httpServer.listen(0, '127.0.0.1', resolve));
    const address = server.httpServer.address() as AddressInfo;
    url = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    clients.forEach((client) => client.close());
    clients.length = 0;
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
    server.messageStore.close();
    rmSync(tempDir, { recursive: true, force: true });
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

  async function joinClient(client: Socket, name: string, roomId: string) {
    const roomState = once<RoomState>(client, 'room:state');
    client.emit('join', { name, roomId });
    return roomState;
  }

  it('joins users, broadcasts messages, and updates presence on disconnect', async () => {
    const ada = await connectClient();
    const grace = await connectClient();

    await joinClient(ada, 'Ada', 'general');

    const adaSawJoin = once<SystemEvent>(ada, 'user:joined');
    const adaSawUpdatedPresence = once<RoomState>(ada, 'room:state');
    await joinClient(grace, 'Grace', 'general');
    expect((await adaSawJoin).user.name).toBe('Grace');
    expect((await adaSawUpdatedPresence).users.map((user) => user.name)).toEqual(['Ada', 'Grace']);

    const messageForAda = once<ChatMessage>(ada, 'message:new');
    const messageForGrace = once<ChatMessage>(grace, 'message:new');
    ada.emit('message:send', { body: '  hello  ' });

    expect(await messageForAda).toMatchObject({ roomId: 'general', userName: 'Ada', body: 'hello' });
    expect(await messageForGrace).toMatchObject({
      roomId: 'general',
      userName: 'Ada',
      body: 'hello'
    });

    const graceSawLeave = once<SystemEvent>(grace, 'user:left');
    ada.close();
    expect((await graceSawLeave).user.name).toBe('Ada');
  });

  it('loads persisted messages into room state after a server restart', async () => {
    const ada = await connectClient();
    await joinClient(ada, 'Ada', 'design');

    const sentMessage = once<ChatMessage>(ada, 'message:new');
    ada.emit('message:send', { body: 'still here after restart' });
    expect(await sentMessage).toMatchObject({
      userName: 'Ada',
      body: 'still here after restart'
    });

    clients.forEach((client) => client.close());
    clients.length = 0;
    await new Promise<void>((resolve) => server.io.close(() => resolve()));
    await new Promise<void>((resolve) => server.httpServer.close(() => resolve()));
    server.messageStore.close();

    server = createChatServer({
      clientOrigin: '*',
      messageStore: createSqliteMessageStore(dbPath),
      messageRateLimit: {
        maxMessages: 5,
        windowMs: 80
      }
    });
    await new Promise<void>((resolve) => server.httpServer.listen(0, '127.0.0.1', resolve));
    const address = server.httpServer.address() as AddressInfo;
    url = `http://127.0.0.1:${address.port}`;

    const grace = await connectClient();
    const state = await joinClient(grace, 'Grace', 'design');

    expect(state.roomId).toBe('design');
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0]).toMatchObject({
      roomId: 'design',
      userName: 'Ada',
      body: 'still here after restart'
    });
  });

  it('isolates messages and presence between rooms', async () => {
    const ada = await connectClient();
    const grace = await connectClient();

    await joinClient(ada, 'Ada', 'general');
    await joinClient(grace, 'Grace', 'design');

    let graceReceivedMessage = false;
    let graceReceivedJoin = false;
    grace.once('message:new', () => {
      graceReceivedMessage = true;
    });
    grace.once('user:joined', () => {
      graceReceivedJoin = true;
    });

    const messageForAda = once<ChatMessage>(ada, 'message:new');
    ada.emit('message:send', { body: 'general only' });

    expect(await messageForAda).toMatchObject({ roomId: 'general', body: 'general only' });
    await wait(40);
    expect(graceReceivedMessage).toBe(false);
    expect(graceReceivedJoin).toBe(false);
  });

  it('updates old and new room presence when switching rooms', async () => {
    const ada = await connectClient();
    const grace = await connectClient();

    await joinClient(ada, 'Ada', 'general');
    await joinClient(grace, 'Grace', 'general');

    const graceSawLeave = once<SystemEvent>(grace, 'user:left');
    const graceSawState = once<RoomState>(grace, 'room:state');
    ada.emit('join', { name: 'Ada', roomId: 'design' });
    expect((await graceSawLeave).user.name).toBe('Ada');
    const generalState = await graceSawState;
    expect(generalState.users.map((user) => user.name)).toEqual(['Grace']);

    const adaState = await joinClient(ada, 'Ada', 'design');
    expect(adaState.roomId).toBe('design');
    expect(adaState.users.map((user) => user.name)).toEqual(['Ada']);
  });

  it('broadcasts typing updates to users in the same room', async () => {
    const ada = await connectClient();
    const grace = await connectClient();

    await joinClient(ada, 'Ada', 'general');
    await joinClient(grace, 'Grace', 'general');

    const graceSawTyping = once<TypingUpdatePayload>(grace, 'typing:update');
    ada.emit('typing:start');

    expect(await graceSawTyping).toMatchObject({
      roomId: 'general',
      users: [{ name: 'Ada' }]
    });
  });

  it('does not broadcast typing updates across rooms', async () => {
    const ada = await connectClient();
    const grace = await connectClient();

    await joinClient(ada, 'Ada', 'general');
    await joinClient(grace, 'Grace', 'design');

    let graceReceivedTyping = false;
    grace.once('typing:update', () => {
      graceReceivedTyping = true;
    });

    ada.emit('typing:start');
    await wait(40);

    expect(graceReceivedTyping).toBe(false);
  });

  it('clears typing state when a user sends a message', async () => {
    const ada = await connectClient();
    const grace = await connectClient();

    await joinClient(ada, 'Ada', 'general');
    await joinClient(grace, 'Grace', 'general');

    const graceSawTyping = once<TypingUpdatePayload>(grace, 'typing:update');
    ada.emit('typing:start');
    expect((await graceSawTyping).users.map((user) => user.name)).toEqual(['Ada']);

    const graceSawStop = once<TypingUpdatePayload>(grace, 'typing:update');
    ada.emit('message:send', { body: 'done typing' });
    expect((await graceSawStop).users).toEqual([]);
  });

  it('clears typing state when a user switches rooms', async () => {
    const ada = await connectClient();
    const grace = await connectClient();

    await joinClient(ada, 'Ada', 'general');
    await joinClient(grace, 'Grace', 'general');

    const graceSawTyping = once<TypingUpdatePayload>(grace, 'typing:update');
    ada.emit('typing:start');
    expect((await graceSawTyping).users.map((user) => user.name)).toEqual(['Ada']);

    const graceSawStop = once<TypingUpdatePayload>(grace, 'typing:update');
    ada.emit('join', { name: 'Ada', roomId: 'design' });
    expect((await graceSawStop).users).toEqual([]);
  });

  it('clears typing state when a user disconnects', async () => {
    const ada = await connectClient();
    const grace = await connectClient();

    await joinClient(ada, 'Ada', 'general');
    await joinClient(grace, 'Grace', 'general');

    const graceSawTyping = once<TypingUpdatePayload>(grace, 'typing:update');
    ada.emit('typing:start');
    expect((await graceSawTyping).users.map((user) => user.name)).toEqual(['Ada']);

    const graceSawStop = once<TypingUpdatePayload>(grace, 'typing:update');
    ada.close();
    expect((await graceSawStop).users).toEqual([]);
  });

  it('rejects rapid messages without saving or broadcasting them', async () => {
    const ada = await connectClient();
    const grace = await connectClient();

    await joinClient(ada, 'Ada', 'general');
    await joinClient(grace, 'Grace', 'general');

    for (let index = 1; index <= 5; index += 1) {
      const messageForAda = once<ChatMessage>(ada, 'message:new');
      ada.emit('message:send', { body: `message ${index}` });
      expect(await messageForAda).toMatchObject({ body: `message ${index}` });
    }

    let graceReceivedRejectedMessage = false;
    grace.on('message:new', (message: ChatMessage) => {
      if (message.body === 'message 6') {
        graceReceivedRejectedMessage = true;
      }
    });

    const errorForAda = once<ServerErrorPayload>(ada, 'error:notice');
    ada.emit('message:send', { body: 'message 6' });

    expect(await errorForAda).toEqual({ message: 'Slow down before sending another message.' });
    await wait(40);
    expect(graceReceivedRejectedMessage).toBe(false);
    expect(server.messageStore.listRecentMessages('general')).toHaveLength(5);
  });

  it('accepts messages again after the rate limit window passes', async () => {
    const ada = await connectClient();

    await joinClient(ada, 'Ada', 'general');

    for (let index = 1; index <= 5; index += 1) {
      const messageForAda = once<ChatMessage>(ada, 'message:new');
      ada.emit('message:send', { body: `burst ${index}` });
      expect(await messageForAda).toMatchObject({ body: `burst ${index}` });
    }

    await wait(90);

    const laterMessage = once<ChatMessage>(ada, 'message:new');
    ada.emit('message:send', { body: 'after window' });

    expect(await laterMessage).toMatchObject({ body: 'after window' });
  });

  it('clears message rate limit state when a socket disconnects', async () => {
    const ada = await connectClient();

    await joinClient(ada, 'Ada', 'general');

    for (let index = 1; index <= 5; index += 1) {
      const messageForAda = once<ChatMessage>(ada, 'message:new');
      ada.emit('message:send', { body: `before disconnect ${index}` });
      expect(await messageForAda).toMatchObject({ body: `before disconnect ${index}` });
    }

    ada.close();
    await wait(20);

    const reconnectedAda = await connectClient();
    await joinClient(reconnectedAda, 'Ada', 'general');

    const messageAfterReconnect = once<ChatMessage>(reconnectedAda, 'message:new');
    reconnectedAda.emit('message:send', { body: 'after reconnect' });

    expect(await messageAfterReconnect).toMatchObject({ body: 'after reconnect' });
  });
});
