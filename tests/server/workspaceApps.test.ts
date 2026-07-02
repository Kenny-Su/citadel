import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

function runWorkspaceApps(rootDir: string, configPath: string) {
  return execFileSync(process.execPath, ['scripts/run-workspace-apps.mjs', 'build'], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      CITADEL_WORKSPACE_ROOT: rootDir,
      CITADEL_WORKSPACE_APPS_CONFIG: configPath
    },
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

describe('workspace app build selection', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it('allows external-only app selection with no workspace app builds', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-workspace-apps-'));
    const rootDir = tempDir;
    const workspaceAppsPath = join(rootDir, 'workspace-apps.json');

    mkdirSync(join(rootDir, 'node_modules/@citadel/app-snake'), { recursive: true });
    writeFileSync(join(rootDir, 'bundled-apps.json'), JSON.stringify({
      packages: ['@citadel/app-snake']
    }, null, 2));
    writeFileSync(workspaceAppsPath, JSON.stringify({
      packages: []
    }, null, 2));

    expect(runWorkspaceApps(rootDir, workspaceAppsPath)).toBe('');
  });

  it('validates workspace app build selection independently from bundled app selection', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-workspace-apps-'));
    const rootDir = tempDir;
    const workspaceAppsPath = join(rootDir, 'workspace-apps.json');

    writeFileSync(join(rootDir, 'bundled-apps.json'), JSON.stringify({
      packages: ['@citadel/app-snake']
    }, null, 2));
    writeFileSync(workspaceAppsPath, JSON.stringify({
      packages: ['@citadel/app-snake', 7]
    }, null, 2));

    expect(() => runWorkspaceApps(rootDir, workspaceAppsPath)).toThrow(
      'workspace-apps.json packages must contain only non-empty strings'
    );
  });
});
