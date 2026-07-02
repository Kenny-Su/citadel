import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const rootDir = process.env.CITADEL_WORKSPACE_ROOT
  ? resolve(process.env.CITADEL_WORKSPACE_ROOT)
  : defaultRootDir;
const configPath = process.env.CITADEL_WORKSPACE_APPS_CONFIG
  ? resolve(process.env.CITADEL_WORKSPACE_APPS_CONFIG)
  : join(rootDir, 'workspace-apps.json');
const command = process.argv[2];

function readWorkspaceAppsConfig() {
  const config = JSON.parse(readFileSync(configPath, 'utf8'));

  if (!config || typeof config !== 'object' || !Array.isArray(config.packages)) {
    throw new Error('workspace-apps.json must contain a packages array');
  }

  if (!config.packages.every((packageName) => typeof packageName === 'string' && packageName.length > 0)) {
    throw new Error('workspace-apps.json packages must contain only non-empty strings');
  }

  return config;
}

function npmArgsFor(packageName, scriptName) {
  return ['run', scriptName, '-w', packageName];
}

function runPackageScript(packageName, scriptName) {
  return new Promise((resolve, reject) => {
    const child = spawn('npm', npmArgsFor(packageName, scriptName), {
      cwd: rootDir,
      stdio: 'inherit'
    });

    child.on('error', reject);
    child.on('exit', (code, signal) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`${packageName} ${scriptName} failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`));
    });
  });
}

async function runBuild(packageNames) {
  for (const packageName of packageNames) {
    await runPackageScript(packageName, 'build');
  }
}

async function runScript(packageNames, scriptName) {
  for (const packageName of packageNames) {
    await runPackageScript(packageName, scriptName);
  }
}

function runWatch(packageNames) {
  if (packageNames.length === 0) {
    return;
  }

  const children = packageNames.map((packageName) => (
    spawn('npm', npmArgsFor(packageName, 'build:watch'), {
      cwd: rootDir,
      stdio: 'inherit'
    })
  ));

  let shuttingDown = false;

  function stopAll(signal = 'SIGTERM') {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;
    for (const child of children) {
      if (!child.killed) {
        child.kill(signal);
      }
    }
  }

  process.on('SIGINT', () => stopAll('SIGINT'));
  process.on('SIGTERM', () => stopAll('SIGTERM'));

  for (const child of children) {
    child.on('error', (error) => {
      console.error(error);
      stopAll();
      process.exitCode = 1;
    });
    child.on('exit', (code, signal) => {
      if (shuttingDown) {
        return;
      }

      if (code !== 0) {
        console.error(`Workspace app watcher failed${signal ? ` with signal ${signal}` : ` with exit code ${code}`}`);
        stopAll();
        process.exitCode = code ?? 1;
      }
    });
  }
}

if (!['build', 'build:watch', 'clean', 'typecheck'].includes(command)) {
  throw new Error('Usage: node scripts/run-workspace-apps.mjs <build|build:watch|clean|typecheck>');
}

const { packages } = readWorkspaceAppsConfig();

if (command === 'build') {
  await runBuild(packages);
} else if (command === 'build:watch') {
  runWatch(packages);
} else {
  await runScript(packages, command);
}
