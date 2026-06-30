import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createBundledServerApps, resolveBundledRepositories } from '../../src/apps/serverRegistry.js';
import { openCitadelDatabase, type CitadelDatabase } from '../../src/persistence/sqlite.js';
import type { ChatRepository } from '../../src/apps/chat/index.js';
import type { ChessRepository } from '../../src/apps/chess/index.js';

describe('bundled server app registry', () => {
  let tempDir: string;
  let database: CitadelDatabase;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-app-registry-'));
    database = openCitadelDatabase(join(tempDir, 'citadel.sqlite'));
  });

  afterEach(() => {
    database.close();
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('creates the bundled chat, chess, and snake server modules', () => {
    const apps = createBundledServerApps({ database });

    expect(apps.map((app) => app.appId)).toEqual(['chat', 'chess', 'snake']);
  });

  it('uses injected repositories when resolving bundled services', () => {
    const chatRepository = {
      listRecentMessages: vi.fn(() => []),
      saveMessage: vi.fn(),
      countMessages: vi.fn(() => 0),
      close: vi.fn()
    } satisfies ChatRepository;
    const chessRepository = {
      getGame: vi.fn(() => null),
      saveGame: vi.fn(),
      appendMove: vi.fn(),
      listMoves: vi.fn(() => []),
      close: vi.fn()
    } satisfies ChessRepository;

    expect(resolveBundledRepositories({ database, chatRepository, chessRepository })).toEqual({
      chatRepository,
      chessRepository
    });
  });

  it('keeps the platform server free of app imports', () => {
    const source = readFileSync(join(process.cwd(), 'src/platform/server.ts'), 'utf8');

    expect(source).not.toContain('../apps/');
  });
});
