import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { ModuleKind, ScriptTarget, transpileModule } from 'typescript';
import { afterEach, describe, expect, it } from 'vitest';
// @ts-expect-error The generator is a Node ESM script exercised directly by Vitest.
import { generateInstalledAppCatalog, resolveAppPackages, resolveInstalledPackageJsonPath, runGenerator, validatePackageName } from '../../scripts/generate-bundled-apps.mjs';

const validCitadelMetadata = {
  appId: 'demo',
  label: 'Demo',
  defaultSpaceId: 'general',
  persistence: 'sqlite',
  version: '0.1.0',
  client: {
    subpath: './browser',
    registrationExport: 'demoBrowserRegistration'
  },
  server: {
    subpath: './node',
    registrationExport: 'demoNodeRegistration'
  }
};

function writePackage(rootDir: string, packageName: string, packageJson: Record<string, unknown> = {}) {
  const packageJsonPath = resolveInstalledPackageJsonPath(packageName, { rootDir });
  mkdirSync(dirname(packageJsonPath), { recursive: true });
  writeFileSync(packageJsonPath, JSON.stringify({
    name: packageName,
    citadel: validCitadelMetadata,
    ...packageJson
  }, null, 2));
}

function writeRuntimePackage(
  rootDir: string,
  packageName: string,
  options: {
    metadata?: typeof validCitadelMetadata;
    rootDescriptor?: Record<string, unknown>;
    clientExports?: string;
    serverExports?: string;
  } = {}
) {
  const metadata = options.metadata ?? validCitadelMetadata;
  const packageJsonPath = resolveInstalledPackageJsonPath(packageName, { rootDir });
  const packageDir = dirname(packageJsonPath);
  mkdirSync(join(packageDir, 'dist'), { recursive: true });
  writeFileSync(packageJsonPath, JSON.stringify({
    name: packageName,
    type: 'module',
    exports: {
      '.': {
        import: './dist/index.js'
      },
      [metadata.client.subpath]: {
        import: './dist/client.js'
      },
      [metadata.server.subpath]: {
        import: './dist/server.js'
      }
    },
    citadel: metadata
  }, null, 2));
  writeFileSync(join(packageDir, 'dist/index.js'), [
    `export const demoAppPackage = ${JSON.stringify(options.rootDescriptor ?? {
      appId: metadata.appId,
      manifest: {
        appId: metadata.appId,
        label: metadata.label,
        defaultSpaceId: metadata.defaultSpaceId,
        persistence: metadata.persistence,
        version: metadata.version
      },
      packageName,
      client: metadata.client,
      server: metadata.server
    })};`
  ].join('\n'));
  writeFileSync(join(packageDir, 'dist/client.js'), options.clientExports ?? (
    `export const ${metadata.client.registrationExport} = { appId: ${JSON.stringify(metadata.appId)} };\n`
  ));
  writeFileSync(join(packageDir, 'dist/server.js'), options.serverExports ?? (
    `export const ${metadata.server.registrationExport} = { appId: ${JSON.stringify(metadata.appId)} };\n`
  ));
}

function generatorOutputs(rootDir: string) {
  return [
    {
      path: join(rootDir, 'src/bundledApps/generatedAppCatalog.ts'),
      generate: generateInstalledAppCatalog
    }
  ];
}

async function runGeneratorForPackages(rootDir: string, packages: string[]) {
  const configPath = join(rootDir, 'bundled-apps.json');
  writeFileSync(configPath, JSON.stringify({ packages }, null, 2));

  for (const output of generatorOutputs(rootDir)) {
    mkdirSync(dirname(output.path), { recursive: true });
  }

  await runGenerator({
    rootDir,
    configPath,
    outputs: generatorOutputs(rootDir)
  });
}

type PackFile = {
  path: string;
};

type PackResult = {
  filename: string;
  files: PackFile[];
};

function runNpm(args: string[], options: { cacheDir: string }) {
  return execFileSync('npm', args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      npm_config_cache: options.cacheDir
    },
    encoding: 'utf8'
  });
}

function packSnake(options: { cacheDir: string; destinationDir: string }) {
  const packOutput = runNpm([
    'pack',
    '--json',
    '--pack-destination',
    options.destinationDir,
    '-w',
    '@citadel/app-snake'
  ], { cacheDir: options.cacheDir });
  const [packResult] = JSON.parse(packOutput) as PackResult[];

  return {
    packResult,
    tarballPath: join(options.destinationDir, packResult.filename)
  };
}

function installPackedSnakeHost(options: { cacheDir: string; rootDir: string }) {
  const packDir = join(options.rootDir, 'packs');
  const extractDir = join(options.rootDir, 'extract');
  const hostDir = join(options.rootDir, 'host');
  const installedSnakeDir = join(hostDir, 'node_modules/@citadel/app-snake');
  mkdirSync(packDir, { recursive: true });
  mkdirSync(extractDir, { recursive: true });

  runNpm(['run', 'build', '-w', '@citadel/app-snake'], { cacheDir: options.cacheDir });
  const { tarballPath } = packSnake({ cacheDir: options.cacheDir, destinationDir: packDir });
  execFileSync('tar', ['-xzf', tarballPath, '-C', extractDir]);
  mkdirSync(dirname(installedSnakeDir), { recursive: true });
  cpSync(join(extractDir, 'package'), installedSnakeDir, { recursive: true });

  return {
    hostDir,
    installedSnakeDir
  };
}

function linkHostDependency(hostDir: string, packageName: string) {
  const dependencyPath = join(hostDir, 'node_modules', ...packageName.split('/'));
  mkdirSync(dirname(dependencyPath), { recursive: true });
  symlinkSync(join(process.cwd(), 'node_modules', ...packageName.split('/')), dependencyPath, 'dir');
}

function transpileGeneratedCatalog(hostDir: string) {
  const sourcePath = join(hostDir, 'src/bundledApps/generatedAppCatalog.ts');
  const outputPath = join(hostDir, 'src/bundledApps/generatedAppCatalog.mjs');
  const output = transpileModule(readFileSync(sourcePath, 'utf8'), {
    compilerOptions: {
      module: ModuleKind.ES2022,
      target: ScriptTarget.ES2022
    }
  });

  writeFileSync(outputPath, output.outputText);

  return outputPath;
}

describe('bundled app generator package resolution', () => {
  let tempDir: string | undefined;

  afterEach(() => {
    if (tempDir) {
      rmSync(tempDir, { recursive: true, force: true });
      tempDir = undefined;
    }
  });

  it('resolves current workspace app packages through installed node_modules links', () => {
    const appPackages = resolveAppPackages({
      packages: [
        '@citadel/app-chat',
        '@citadel/app-chess',
        '@citadel/app-snake'
      ]
    });

    expect(appPackages.map((appPackage: { appId: string }) => appPackage.appId)).toEqual(['chat', 'chess', 'snake']);
    expect(appPackages.map((appPackage: { packageName: string }) => appPackage.packageName)).toEqual([
      '@citadel/app-chat',
      '@citadel/app-chess',
      '@citadel/app-snake'
    ]);
  });

  it('resolves metadata from installed package directories instead of workspace config', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-generator-'));
    writePackage(tempDir, '@example/app-demo');

    const [appPackage] = resolveAppPackages({
      packages: ['@example/app-demo']
    }, { rootDir: tempDir });

    expect(appPackage).toEqual({
      appId: 'demo',
      manifest: {
        appId: 'demo',
        label: 'Demo',
        defaultSpaceId: 'general',
        persistence: 'sqlite',
        version: '0.1.0'
      },
      packageName: '@example/app-demo',
      client: validCitadelMetadata.client,
      server: validCitadelMetadata.server
    });
    expect(generateInstalledAppCatalog([appPackage])).toContain(
      "import { demoBrowserRegistration as bundledClientRegistration0 } from '@example/app-demo/browser';"
    );
    expect(generateInstalledAppCatalog([appPackage])).toContain(
      "import { demoNodeRegistration as bundledServerRegistration0 } from '@example/app-demo/node';"
    );
  });

  it('resolves workspace symlinks through node_modules package directories', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-generator-'));
    const workspacePackageDir = join(tempDir, 'workspace-app');
    const installedPackageDir = join(tempDir, 'node_modules/@example/app-demo');
    mkdirSync(workspacePackageDir, { recursive: true });
    writeFileSync(join(workspacePackageDir, 'package.json'), JSON.stringify({
      name: '@example/app-demo',
      citadel: validCitadelMetadata
    }, null, 2));
    mkdirSync(dirname(installedPackageDir), { recursive: true });
    symlinkSync(workspacePackageDir, installedPackageDir, 'dir');

    expect(resolveAppPackages({
      packages: ['@example/app-demo']
    }, { rootDir: tempDir })[0].appId).toBe('demo');
  });

  it('rejects missing installed packages and unsafe package names', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-generator-'));

    expect(() => resolveAppPackages({
      packages: ['@example/app-missing']
    }, { rootDir: tempDir })).toThrow(
      'Bundled app package @example/app-missing is not installed at node_modules/@example/app-missing/package.json'
    );

    for (const packageName of ['', '../app', '@scope/../app', '/tmp/app', 'app/extra', '@scope', '@scope/app/extra']) {
      expect(() => validatePackageName(packageName)).toThrow();
    }
  });

  it('rejects invalid citadel metadata and duplicate app ids', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-generator-'));
    writePackage(tempDir, '@example/app-missing-metadata', { citadel: undefined });
    writePackage(tempDir, '@example/app-invalid-persistence', {
      citadel: {
        ...validCitadelMetadata,
        persistence: 'json'
      }
    });
    writePackage(tempDir, '@example/app-a');
    writePackage(tempDir, '@example/app-b');

    expect(() => resolveAppPackages({
      packages: ['@example/app-missing-metadata']
    }, { rootDir: tempDir })).toThrow(
      'Bundled app package @example/app-missing-metadata must declare citadel metadata'
    );
    expect(() => resolveAppPackages({
      packages: ['@example/app-invalid-persistence']
    }, { rootDir: tempDir })).toThrow(
      'Bundled app package @example/app-invalid-persistence citadel.persistence must be "none" or "sqlite"'
    );
    expect(() => resolveAppPackages({
      packages: ['@example/app-a', '@example/app-b']
    }, { rootDir: tempDir })).toThrow('Duplicate bundled app id: demo');
  });

  it('packs snake as a built package artifact without source files', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-generator-'));
    const cacheDir = join(tempDir, 'npm-cache');

    runNpm(['run', 'build', '-w', '@citadel/app-snake'], { cacheDir });
    const packOutput = runNpm(['pack', '--dry-run', '--json', '-w', '@citadel/app-snake'], { cacheDir });
    const [packResult] = JSON.parse(packOutput) as PackResult[];
    const packedFiles = packResult.files.map((file) => file.path).sort();

    expect(packedFiles).toContain('package.json');
    expect(packedFiles).toContain('dist/index.js');
    expect(packedFiles).toContain('dist/index.d.ts');
    expect(packedFiles).toContain('dist/client.js');
    expect(packedFiles).toContain('dist/client.d.ts');
    expect(packedFiles).toContain('dist/server.js');
    expect(packedFiles).toContain('dist/server.d.ts');
    expect(packedFiles.some((file) => file.startsWith('src/'))).toBe(false);
    expect(packedFiles).not.toContain('index.ts');
    expect(packedFiles).not.toContain('client.ts');
    expect(packedFiles).not.toContain('server.ts');
    expect(packedFiles).not.toContain('tsconfig.json');
    expect(packedFiles).not.toContain('tsconfig.build.json');
  });

  it('generates bundled app registries from a packed snake dependency install', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-generator-'));
    const cacheDir = join(tempDir, 'npm-cache');
    const { hostDir, installedSnakeDir } = installPackedSnakeHost({ cacheDir, rootDir: tempDir });
    const [{ path: generatedCatalogPath }] = generatorOutputs(hostDir);
    linkHostDependency(hostDir, '@citadel/platform');
    linkHostDependency(hostDir, 'react');

    await runGeneratorForPackages(hostDir, ['@citadel/app-snake']);

    const generatedCatalog = readFileSync(generatedCatalogPath, 'utf8');

    expect(JSON.parse(readFileSync(join(installedSnakeDir, 'package.json'), 'utf8')).citadel.appId).toBe('snake');
    expect(generatedCatalog).toContain('"@citadel/app-snake"');
    expect(generatedCatalog).toContain('appId: "snake"');
    expect(generatedCatalog).toContain('persistence: "none"');
    expect(generatedCatalog).toContain('bundledInstalledApps');
    expect(generatedCatalog).toContain('bundledAppDescriptorByPackageName');
    expect(generatedCatalog).toContain('bundledClientRegistrationByPackageName');
    expect(generatedCatalog).toContain('bundledServerRegistrationByPackageName');
    expect(generatedCatalog).not.toContain('@citadel/app-chat');
    expect(generatedCatalog).not.toContain('@citadel/app-chess');
    expect(generatedCatalog).toContain(
      "import { snakeClientRegistration as bundledClientRegistration0 } from '@citadel/app-snake/client';"
    );
    expect(generatedCatalog).toContain(
      "import { snakeServerRegistration as bundledServerRegistration0 } from '@citadel/app-snake/server';"
    );
  });

  it('boots a snake-only host catalog from a packed external dependency', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-generator-'));
    const cacheDir = join(tempDir, 'npm-cache');
    const { hostDir } = installPackedSnakeHost({ cacheDir, rootDir: tempDir });
    const probePath = join(hostDir, 'probe.ts');
    linkHostDependency(hostDir, '@citadel/platform');
    linkHostDependency(hostDir, 'react');
    writeFileSync(join(hostDir, 'workspace-apps.json'), JSON.stringify({ packages: [] }, null, 2));
    writeFileSync(join(hostDir, 'package.json'), JSON.stringify({
      name: 'snake-external-host-fixture',
      private: true,
      type: 'module',
      workspaces: []
    }, null, 2));

    await runGeneratorForPackages(hostDir, ['@citadel/app-snake']);
    transpileGeneratedCatalog(hostDir);
    writeFileSync(probePath, [
      "import { createPlatformServer } from '@citadel/platform/server';",
      "import { bundledInstalledApps, bundledAppDescriptorByAppId, bundledClientRegistrationByAppId, bundledServerRegistrationByAppId } from './src/bundledApps/generatedAppCatalog.mjs';",
      '',
      'const [installedApp] = bundledInstalledApps;',
      'const serverModule = installedApp.serverRegistration.createServerApp({',
      '  database: { database: {} }',
      '});',
      'const platform = createPlatformServer({',
      '  apps: [serverModule],',
      '  appManifests: [installedApp.descriptor.manifest]',
      '});',
      'const initialState = serverModule.getInitialState({',
      "  appId: 'snake',",
      "  spaceId: 'arena',",
      '  participants: [],',
      '  emitToSpace() {},',
      '  emitToParticipant() {},',
      '  emitSpaceState() {},',
      '  getAppState() { return undefined; },',
      '  setAppState() {},',
      '  clearAppState() {}',
      '});',
      'console.log(JSON.stringify({',
      '  installedCount: bundledInstalledApps.length,',
      '  descriptorAppId: installedApp.descriptor.appId,',
      '  descriptorPackageName: installedApp.descriptor.packageName,',
      '  descriptorByAppId: bundledAppDescriptorByAppId.snake?.packageName,',
      '  clientRegistrationAppId: bundledClientRegistrationByAppId.snake?.appId,',
      '  serverRegistrationAppId: bundledServerRegistrationByAppId.snake?.appId,',
      '  serverModuleAppId: serverModule.appId,',
      '  platformAppIds: [...platform.apps.keys()],',
      '  initialState',
      '}));',
      'platform.io.close();',
      'platform.httpServer.close();'
    ].join('\n'));

    const probe = JSON.parse(execFileSync(process.execPath, [probePath], {
      cwd: hostDir,
      encoding: 'utf8'
    })) as {
      installedCount: number;
      descriptorAppId: string;
      descriptorPackageName: string;
      descriptorByAppId: string;
      clientRegistrationAppId: string;
      serverRegistrationAppId: string;
      serverModuleAppId: string;
      platformAppIds: string[];
      initialState: {
        width: number;
        height: number;
        snakes: unknown[];
      };
    };

    expect(probe).toMatchObject({
      installedCount: 1,
      descriptorAppId: 'snake',
      descriptorPackageName: '@citadel/app-snake',
      descriptorByAppId: '@citadel/app-snake',
      clientRegistrationAppId: 'snake',
      serverRegistrationAppId: 'snake',
      serverModuleAppId: 'snake',
      platformAppIds: ['snake'],
      initialState: {
        width: 20,
        height: 16,
        snakes: []
      }
    });
  });

  it('rejects installed packages whose client registration export is missing', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-generator-'));
    writeRuntimePackage(tempDir, '@example/app-demo', {
      clientExports: 'export const wrongClientRegistration = { appId: "demo" };\n'
    });

    await expect(runGeneratorForPackages(tempDir, ['@example/app-demo'])).rejects.toThrow(
      'Bundled app package @example/app-demo/browser must export demoBrowserRegistration'
    );
  });

  it('rejects installed packages whose root descriptor does not match metadata', async () => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-generator-'));
    writeRuntimePackage(tempDir, '@example/app-demo', {
      rootDescriptor: {
        appId: 'demo',
        manifest: {
          appId: 'demo',
          label: 'Wrong Demo',
          defaultSpaceId: 'general',
          persistence: 'sqlite',
          version: '0.1.0'
        },
        packageName: '@example/app-demo',
        client: validCitadelMetadata.client,
        server: validCitadelMetadata.server
      }
    });

    await expect(runGeneratorForPackages(tempDir, ['@example/app-demo'])).rejects.toThrow(
      'Bundled app package @example/app-demo root surface must export an app package descriptor matching citadel metadata'
    );
  });

  it('imports packed snake public package surfaces from a temp host install', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-generator-'));
    const cacheDir = join(tempDir, 'npm-cache');
    const { hostDir } = installPackedSnakeHost({ cacheDir, rootDir: tempDir });
    const probePath = join(hostDir, 'probe.mjs');
    linkHostDependency(hostDir, '@citadel/platform');
    linkHostDependency(hostDir, 'react');
    writeFileSync(probePath, [
      "import * as root from '@citadel/app-snake';",
      "import * as client from '@citadel/app-snake/client';",
      "import * as server from '@citadel/app-snake/server';",
      'console.log(JSON.stringify({',
      '  rootKeys: Object.keys(root).sort(),',
      '  clientKeys: Object.keys(client).sort(),',
      '  serverKeys: Object.keys(server).sort(),',
      '  manifestAppId: root.snakeManifest.appId,',
      '  descriptorPackageName: root.snakeAppPackage.packageName,',
      '  clientRegistrationAppId: client.snakeClientRegistration.appId,',
      '  serverRegistrationAppId: server.snakeServerRegistration.appId',
      '}));'
    ].join('\n'));

    const probe = JSON.parse(execFileSync('node', [probePath], {
      cwd: hostDir,
      encoding: 'utf8'
    })) as {
      rootKeys: string[];
      clientKeys: string[];
      serverKeys: string[];
      manifestAppId: string;
      descriptorPackageName: string;
      clientRegistrationAppId: string;
      serverRegistrationAppId: string;
    };

    expect(probe.rootKeys).toEqual(['snakeAppPackage', 'snakeManifest']);
    expect(probe.clientKeys).toEqual(['snakeClientApp', 'snakeClientRegistration']);
    expect(probe.serverKeys).toEqual([
      'createSnakeServerAppFromServices',
      'snakeServerBundle',
      'snakeServerRegistration'
    ]);
    expect(probe.manifestAppId).toBe('snake');
    expect(probe.descriptorPackageName).toBe('@citadel/app-snake');
    expect(probe.clientRegistrationAppId).toBe('snake');
    expect(probe.serverRegistrationAppId).toBe('snake');
  });

  it('resolves snake from the packed package manifest shape', () => {
    tempDir = mkdtempSync(join(tmpdir(), 'citadel-generator-'));
    const snakePackage = JSON.parse(
      readFileSync(join(process.cwd(), 'packages/apps/snake/package.json'), 'utf8')
    ) as Record<string, unknown>;

    writePackage(tempDir, '@citadel/app-snake', snakePackage);

    const [appPackage] = resolveAppPackages({
      packages: ['@citadel/app-snake']
    }, { rootDir: tempDir });

    expect(appPackage.appId).toBe('snake');
    expect(appPackage.manifest).toEqual({
      appId: 'snake',
      label: 'Snake',
      defaultSpaceId: 'general',
      persistence: 'none',
      version: '0.1.0'
    });
    expect(generateInstalledAppCatalog([appPackage])).toContain(
      "import { snakeClientRegistration as bundledClientRegistration0 } from '@citadel/app-snake/client';"
    );
    expect(generateInstalledAppCatalog([appPackage])).toContain(
      "import { snakeServerRegistration as bundledServerRegistration0 } from '@citadel/app-snake/server';"
    );
  });
});
