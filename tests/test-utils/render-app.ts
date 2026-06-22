import { vi } from 'vitest';

const mockSocket = vi.hoisted(() => ({
  connected: false,
  connect: vi.fn(),
  disconnect: vi.fn(),
  emit: vi.fn(),
  off: vi.fn(),
  on: vi.fn()
}));

const socketHandlers = vi.hoisted(() => new Map<string, (...args: unknown[]) => void>());

vi.mock('socket.io-client', () => {
  mockSocket.on.mockImplementation((event: string, handler: (...args: unknown[]) => void) => {
    socketHandlers.set(event, handler);
    return mockSocket;
  });
  mockSocket.off.mockImplementation((event: string) => {
    socketHandlers.delete(event);
    return mockSocket;
  });

  return {
    io: () => mockSocket
  };
});

export function getMockSocket() {
  return mockSocket;
}

export function resetMockSocket() {
  socketHandlers.clear();
  mockSocket.connected = false;
  mockSocket.connect.mockClear();
  mockSocket.disconnect.mockClear();
  mockSocket.emit.mockClear();
  mockSocket.off.mockClear();
  mockSocket.on.mockClear();
}

export function triggerSocketEvent(event: string, payload?: unknown) {
  socketHandlers.get(event)?.(payload);
}
