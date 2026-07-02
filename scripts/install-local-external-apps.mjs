import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { installPackedWorkspaceApp } from './install-packed-workspace-app.mjs';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = process.env.CITADEL_LOCAL_EXTERNAL_APPS_CONFIG
  ? resolve(process.env.CITADEL_LOCAL_EXTERNAL_APPS_CONFIG)
  : join(rootDir, 'local-external-apps.json');
const jsonOutput = process.argv.includes('--json');

export function readLocalExternalAppsConfig(path = configPath) {
  const config = JSON.parse(readFileSync(path, 'utf8'));

  if (!config || typeof config !== 'object' || !Array.isArray(config.packages)) {
    throw new Error('local-external-apps.json must contain a packages array');
  }

  if (!config.packages.every((packageName) => typeof packageName === 'string' && packageName.length > 0)) {
    throw new Error('local-external-apps.json packages must contain only non-empty strings');
  }

  return config;
}

export function installLocalExternalApps(options = {}) {
  const installRootDir = options.rootDir ?? rootDir;
  const config = readLocalExternalAppsConfig(options.configPath ?? configPath);

  return config.packages.map((packageName) => installPackedWorkspaceApp({
    packageName,
    installRootDir,
    quiet: options.quiet ?? false
  }));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const results = installLocalExternalApps({ quiet: jsonOutput });

    if (jsonOutput) {
      console.log(JSON.stringify(results, null, 2));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
