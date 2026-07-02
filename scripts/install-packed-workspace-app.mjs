import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { packWorkspaceApp } from './pack-workspace-app.mjs';
import { validatePackageName } from './generate-bundled-apps.mjs';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const defaultDestinationDir = join(rootDir, '.citadel/app-packs');

function usage() {
  return [
    'Usage: node scripts/install-packed-workspace-app.mjs <package-name> [--root <dir>] [--destination <dir>] [--skip-build] [--json]',
    '',
    'Packs a workspace app, then installs the packed artifact into <root>/node_modules.'
  ].join('\n');
}

export function parseArgs(argv) {
  let packageName;
  let installRootDir = rootDir;
  let destinationDir = defaultDestinationDir;
  let skipBuild = false;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--root') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('--root requires a directory path');
      }

      installRootDir = resolve(rootDir, value);
      index += 1;
      continue;
    }

    if (token === '--destination') {
      const value = argv[index + 1];

      if (!value) {
        throw new Error('--destination requires a directory path');
      }

      destinationDir = resolve(rootDir, value);
      index += 1;
      continue;
    }

    if (token === '--skip-build') {
      skipBuild = true;
      continue;
    }

    if (token === '--json') {
      json = true;
      continue;
    }

    if (token.startsWith('-')) {
      throw new Error(`Unknown option: ${token}`);
    }

    if (packageName) {
      throw new Error(`Unexpected argument: ${token}`);
    }

    packageName = token;
  }

  if (!packageName) {
    throw new Error(usage());
  }

  validatePackageName(packageName);

  return {
    packageName,
    installRootDir,
    destinationDir,
    skipBuild,
    json
  };
}

export function installedPackageDir(packageName, installRootDir = rootDir) {
  validatePackageName(packageName);

  return join(installRootDir, 'node_modules', ...packageName.split('/'));
}

export function installPackedWorkspaceApp(options) {
  const {
    packageName,
    configPath,
    installRootDir = rootDir,
    destinationDir = defaultDestinationDir,
    sourceRootDir,
    skipBuild = false,
    quiet = false
  } = options;
  const packResult = packWorkspaceApp({
    packageName,
    configPath,
    destinationDir,
    sourceRootDir,
    skipBuild,
    quiet
  });
  const packageDir = installedPackageDir(packageName, installRootDir);

  rmSync(packageDir, { recursive: true, force: true });
  mkdirSync(packageDir, { recursive: true });
  execFileSync('tar', [
    '-xzf',
    packResult.tarballPath,
    '-C',
    packageDir,
    '--strip-components=1'
  ], {
    stdio: quiet ? ['ignore', 'ignore', 'inherit'] : 'inherit'
  });

  if (!existsSync(join(packageDir, 'package.json'))) {
    throw new Error(`Packed app install for ${packageName} did not produce package.json`);
  }

  return {
    ...packResult,
    installRootDir,
    installedPackageDir: packageDir
  };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const args = parseArgs(process.argv.slice(2));
    const result = installPackedWorkspaceApp({
      packageName: args.packageName,
      installRootDir: args.installRootDir,
      destinationDir: args.destinationDir,
      skipBuild: args.skipBuild,
      quiet: args.json
    });

    if (args.json) {
      console.log(JSON.stringify(result, null, 2));
    } else {
      console.log(`Installed ${result.packageName} from ${result.tarballPath} to ${result.installedPackageDir}`);
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
}
