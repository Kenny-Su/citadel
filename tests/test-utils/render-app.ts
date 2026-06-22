import { vi } from 'vitest';

vi.mock('socket.io-client', () => {
  return {
    io: () => ({
      connected: false,
      connect: vi.fn(),
      emit: vi.fn(),
      off: vi.fn(),
      on: vi.fn()
    })
  };
});
