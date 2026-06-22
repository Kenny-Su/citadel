import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createChatServer } from '../../src/server/chatServer.js';
import { createSqliteMessageStore } from '../../src/server/messageStore.js';

const staticDir = resolve(process.cwd(), 'dist');
const hasBuiltClient = existsSync(join(staticDir, 'index.html'));

describe.skipIf(!hasBuiltClient)('production server', () => {
  let server: ReturnType<typeof createChatServer>;
  let tempDir: string;
  let url: string;

  beforeEach(async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-chat-production-'));
    server = createChatServer({
      clientOrigin: '*',
      messageStore: createSqliteMessageStore(join(tempDir, 'chat.sqlite')),
      staticDir
    });
    await new Promise<void>((resolveListen) =>
      server.httpServer.listen(0, '127.0.0.1', resolveListen)
    );
    const address = server.httpServer.address() as AddressInfo;
    url = `http://127.0.0.1:${address.port}`;
  });

  afterEach(async () => {
    await new Promise<void>((resolveClose) => server.io.close(() => resolveClose()));
    await new Promise<void>((resolveClose) => server.httpServer.close(() => resolveClose()));
    server.messageStore.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('serves health and room routes from one server', async () => {
    const health = await fetch(`${url}/health`);
    await expect(health.json()).resolves.toMatchObject({ ok: true });

    const room = await fetch(`${url}/rooms/general`);
    expect(room.headers.get('content-type')).toContain('text/html');
    expect(await room.text()).toContain('<div id="root"></div>');
  });
});
