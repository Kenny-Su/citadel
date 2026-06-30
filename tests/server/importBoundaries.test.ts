import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const appIds = ['chat', 'chess', 'snake'] as const;
const appShimFilesById = {
  chat: [
    'ChatView.tsx',
    'client.tsx',
    'index.ts',
    'manifest.ts',
    'messageStore.ts',
    'server.ts',
    'serverEntry.ts',
    'shared.ts',
    'validation.ts'
  ],
  chess: [
    'ChessView.tsx',
    'client.tsx',
    'index.ts',
    'manifest.ts',
    'repository.ts',
    'server.ts',
    'serverEntry.ts',
    'shared.ts'
  ],
  snake: [
    'SnakeView.tsx',
    'client.tsx',
    'index.ts',
    'manifest.ts',
    'server.ts',
    'serverEntry.ts',
    'shared.ts'
  ]
} as const;
const platformEntrypointNames = ['app', 'client', 'persistence', 'server', 'server-app', 'validation'] as const;
const platformSourceModuleNames = [
  'app',
  'appContract',
  'client',
  'clientAppContract',
  'persistence',
  'server',
  'serverApp',
  'serverAppContract',
  'shared',
  'sqlite',
  'validation',
  'version'
] as const;
const deletedCompatibilityPaths = [
  'src/apps/catalog.ts',
  'src/apps/serverRegistry.ts',
  'src/apps/serverServices.ts',
  'src/persistence/sqlite.ts',
  'src/server/messageStore.ts',
  'src/server/validation.ts',
  'src/shared/chat.ts',
  'src/shared/platform.ts'
] as const;

function source(path: string) {
  return readFileSync(join(process.cwd(), path), 'utf8');
}

function jsonSource<T>(path: string) {
  return JSON.parse(source(path)) as T;
}

type PackageTsconfig = {
  extends?: string;
  include?: string[];
  compilerOptions?: Record<string, unknown>;
};

const packagePaths = [
  'packages/platform',
  'packages/apps/chat',
  'packages/apps/chess',
  'packages/apps/snake'
] as const;

function appImplementationPath(appId: (typeof appIds)[number], fileName: string) {
  return `packages/apps/${appId}/src/${fileName}`;
}

function exists(path: string) {
  return existsSync(join(process.cwd(), path));
}

describe('app package import boundaries', () => {
  it('keeps platform core free of concrete apps and root compatibility imports', () => {
    for (const moduleName of platformSourceModuleNames) {
      const moduleSource = source(`packages/platform/src/${moduleName}.ts`);

      expect(moduleSource).not.toContain('../apps/');
      expect(moduleSource).not.toContain('../../../src/');
    }
    expect(source('packages/platform/src/appContract.ts')).not.toContain('react');
  });

  it('keeps platform contracts split by environment', () => {
    expect(source('packages/platform/src/appContract.ts')).not.toMatch(
      /clientAppContract|serverAppContract|ComponentType/
    );
    expect(source('packages/platform/src/clientAppContract.ts')).toContain("from 'react'");
    expect(source('packages/platform/src/clientAppContract.ts')).not.toContain('serverAppContract');
    expect(source('packages/platform/src/serverAppContract.ts')).not.toMatch(
      /clientAppContract|react|ComponentType/
    );
  });

  it('keeps neutral app indexes limited to manifests and shared types', () => {
    for (const appId of appIds) {
      const indexSource = source(appImplementationPath(appId, 'index.ts'));

      expect(indexSource).toContain(`export { ${appId}Manifest } from './manifest.js'`);
      expect(indexSource).toContain("} from './shared.js'");
      expect(indexSource).not.toMatch(
        /client|serverEntry|ServerBundle|Repository|messageStore|repository|validation|create[A-Z].*App/
      );
    }
  });

  it('keeps client registry wired to real app packages and platform client contracts', () => {
    const registry = source('src/client/appRegistry.tsx');

    expect(registry).toContain("from '../bundledApps/catalog'");
    expect(registry).toContain("from '@citadel/platform/app'");
    expect(registry).toContain("from '@citadel/platform/client'");
    for (const appId of appIds) {
      expect(registry).toContain(`from '@citadel/app-${appId}'`);
      expect(registry).toContain(`from '@citadel/app-${appId}/client'`);
      expect(registry).not.toContain(`@citadel/app-${appId}/server`);
      expect(registry).not.toContain(`@citadel/apps/${appId}`);
    }
  });

  it('keeps bundled server registry wired to real app server packages', () => {
    const registry = source('src/bundledApps/serverRegistry.ts');

    expect(registry).toContain("from './catalog.js'");
    expect(registry).toContain("from '@citadel/platform/server-app'");
    for (const appId of appIds) {
      expect(registry).toContain(`from '@citadel/app-${appId}/server'`);
      expect(registry).not.toContain(`@citadel/app-${appId}/client`);
      expect(registry).not.toContain(`@citadel/apps/${appId}`);
    }
    expect(registry).not.toMatch(
      /\.\/(?:chat|chess|snake)\/(?:client|server|manifest|shared|repository|messageStore|validation|ChatView|ChessView|SnakeView)\.js/
    );
  });

  it('keeps app client code away from server-only surfaces', () => {
    const forbiddenClientImports =
      /(?:serverEntry|serverAppContract|messageStore|repository|node:fs|node:path|node:sqlite|from ['"]\.\/server(?:\.js)?['"])/;

    for (const appId of appIds) {
      expect(source(appImplementationPath(appId, 'client.tsx'))).not.toMatch(forbiddenClientImports);
      expect(source(appImplementationPath(appId, `${appId[0].toUpperCase()}${appId.slice(1)}View.tsx`))).not.toMatch(
        forbiddenClientImports
      );
    }
  });

  it('keeps app server entrypoints away from client-only surfaces', () => {
    const forbiddenServerImports = /(?:\.\/client|clientAppContract|ChatView|ChessView|SnakeView|react)/;

    for (const appId of appIds) {
      expect(source(appImplementationPath(appId, 'serverEntry.ts'))).not.toMatch(forbiddenServerImports);
    }
  });

  it('keeps shared server services platform-only', () => {
    const services = source('src/bundledApps/serverServices.ts');

    expect(services).toContain('@citadel/platform/server-app');
    expect(services).not.toMatch(/AppId|chat|chess|messageStore|Repository|RateLimit|enabledAppIds/);
  });

  it('keeps app server service types scoped to their own app', () => {
    expect(source(appImplementationPath('chat', 'serverEntry.ts'))).not.toMatch(/chess|Chess/);
    expect(source(appImplementationPath('chess', 'serverEntry.ts'))).not.toMatch(/chat|Chat|messageStore/);
    expect(source(appImplementationPath('snake', 'serverEntry.ts'))).not.toMatch(
      /chat|Chat|chess|Chess|Repository|messageStore/
    );
  });

  it('keeps app code on platform facade imports', () => {
    const forbiddenDeepAppImports =
      /\.\.\/\.\.\/(?:shared\/platform|platform\/(?:app|client|serverApp|persistence|appContract|clientAppContract|serverAppContract|validation)|persistence\/sqlite)\.js?/;

    for (const appId of appIds) {
      const manifest = source(appImplementationPath(appId, 'manifest.ts'));
      const client = source(appImplementationPath(appId, 'client.tsx'));
      const view = source(appImplementationPath(appId, `${appId[0].toUpperCase()}${appId.slice(1)}View.tsx`));
      const server = source(appImplementationPath(appId, 'server.ts'));
      const serverEntry = source(appImplementationPath(appId, 'serverEntry.ts'));

      expect(manifest).toContain('@citadel/platform/app');
      expect(manifest).not.toMatch(forbiddenDeepAppImports);
      expect(client).toContain('@citadel/platform/client');
      expect(client).not.toContain('@citadel/platform/server-app');
      expect(client).not.toMatch(forbiddenDeepAppImports);
      expect(view).toContain('@citadel/platform/client');
      expect(view).not.toContain('@citadel/platform/server-app');
      expect(view).not.toMatch(forbiddenDeepAppImports);
      expect(server).toContain('@citadel/platform/');
      expect(server).not.toContain('@citadel/platform/client');
      expect(server).not.toMatch(forbiddenDeepAppImports);
      expect(serverEntry).toContain('@citadel/platform/server-app');
      expect(serverEntry).not.toContain('@citadel/platform/client');
      expect(serverEntry).not.toMatch(forbiddenDeepAppImports);
    }
  });

  it('declares only real package-shaped aliases for TypeScript and Vite', () => {
    const tsconfig = source('tsconfig.json');
    const viteConfig = source('vite.config.ts');

    for (const alias of [
      '@citadel/platform/app',
      '@citadel/platform/client',
      '@citadel/platform/server-app',
      '@citadel/platform/persistence',
      '@citadel/platform/server',
      '@citadel/platform/validation',
      '@citadel/app-chat',
      '@citadel/app-chat/client',
      '@citadel/app-chat/server',
      '@citadel/app-chat/validation',
      '@citadel/app-chess',
      '@citadel/app-chess/client',
      '@citadel/app-chess/server',
      '@citadel/app-snake',
      '@citadel/app-snake/client',
      '@citadel/app-snake/server'
    ]) {
      expect(tsconfig).toContain(alias);
      expect(viteConfig).toContain(alias);
    }

    expect(tsconfig).not.toContain('@citadel/apps/');
    expect(tsconfig).not.toContain('@citadel/apps/catalog');
    expect(viteConfig).not.toContain('@citadel/apps/');
    expect(viteConfig).not.toContain('@citadel/apps/catalog');
  });

  it('declares workspace package exports for platform and bundled apps', () => {
    const rootPackage = jsonSource<{ workspaces: string[]; scripts: Record<string, string> }>('package.json');
    const platformPackage = jsonSource<{
      name: string;
      exports: Record<string, string>;
      scripts: Record<string, string>;
    }>(
      'packages/platform/package.json'
    );

    expect(rootPackage.scripts.typecheck).toBe(
      'npm run typecheck:client && npm run typecheck:server && npm run typecheck:packages'
    );
    expect(rootPackage.scripts['typecheck:packages']).toBe('npm run typecheck --workspaces --if-present');
    expect(rootPackage.scripts.build).toBe('npm run typecheck && npm run build:packages && npm run build:client');
    expect(rootPackage.scripts['build:packages']).toBe('npm run build --workspaces --if-present');
    expect(rootPackage.scripts['clean:packages']).toBe('npm run clean --workspaces --if-present');
    expect(rootPackage.workspaces).toEqual([...packagePaths]);
    expect(platformPackage.name).toBe('@citadel/platform');
    expect(platformPackage.exports).toEqual({
      './app': './app.ts',
      './client': './client.ts',
      './server-app': './server-app.ts',
      './persistence': './persistence.ts',
      './server': './server.ts',
      './validation': './validation.ts'
    });
    expect(Object.values(platformPackage.exports).every((entry) => entry.endsWith('.ts'))).toBe(true);
    expect(Object.values(platformPackage.exports).every((entry) => !entry.startsWith('./dist/'))).toBe(true);
    expect(platformPackage.scripts.build).toBe('tsc -p tsconfig.build.json');
    expect(platformPackage.scripts.clean).toBe("node -e \"fs.rmSync('dist', { recursive: true, force: true })\"");
    expect(platformPackage.scripts.typecheck).toBe('tsc -p tsconfig.json --noEmit');

    for (const appId of appIds) {
      const appPackage = jsonSource<{
        name: string;
        exports: Record<string, string>;
        scripts: Record<string, string>;
        dependencies?: Record<string, string>;
      }>(`packages/apps/${appId}/package.json`);

      expect(appPackage.name).toBe(`@citadel/app-${appId}`);
      expect(appPackage.exports).toEqual(
        appId === 'chat'
          ? {
            '.': './index.ts',
            './client': './client.ts',
            './server': './server.ts',
            './validation': './validation.ts'
          }
          : {
            '.': './index.ts',
            './client': './client.ts',
            './server': './server.ts'
          }
      );
      expect(Object.values(appPackage.exports).every((entry) => entry.endsWith('.ts'))).toBe(true);
      expect(Object.values(appPackage.exports).every((entry) => !entry.startsWith('./dist/'))).toBe(true);
      expect(appPackage.scripts.build).toBe('tsc -p tsconfig.build.json');
      expect(appPackage.scripts.clean).toBe("node -e \"fs.rmSync('dist', { recursive: true, force: true })\"");
      expect(appPackage.scripts.typecheck).toBe('tsc -p tsconfig.json --noEmit');
      expect(appPackage.dependencies?.['@citadel/platform']).toBe('0.1.0');
    }
  });

  it('checks each package through a package-local no-emit tsconfig', () => {
    const packageBase = jsonSource<PackageTsconfig>('tsconfig.package-base.json');

    expect(packageBase.compilerOptions?.noEmit).toBe(true);
    expect(packageBase.compilerOptions).not.toHaveProperty('declaration');
    expect(packageBase.compilerOptions).not.toHaveProperty('emitDeclarationOnly');
    expect(packageBase.compilerOptions).not.toHaveProperty('outDir');

    const platformConfig = jsonSource<PackageTsconfig>('packages/platform/tsconfig.json');
    expect(platformConfig.extends).toBe('../../tsconfig.package-base.json');
    expect(platformConfig.include).toEqual(['*.ts', 'src/**/*.ts']);
    expect(platformConfig.include?.join(' ')).not.toMatch(/\.\.|tests|packages\//);

    for (const appId of appIds) {
      const appConfig = jsonSource<PackageTsconfig>(`packages/apps/${appId}/tsconfig.json`);

      expect(appConfig.extends).toBe('../../../tsconfig.package-base.json');
      expect(appConfig.include).toEqual(['*.ts', 'src/**/*.ts', 'src/**/*.tsx']);
      expect(appConfig.include?.join(' ')).not.toMatch(/\.\.|tests|packages\//);
      expect(appConfig.compilerOptions).toBeUndefined();
    }
  });

  it('builds package artifacts without making dist the source of truth', () => {
    const gitignore = source('.gitignore');
    const packageBuildBase = jsonSource<PackageTsconfig>('tsconfig.package-build-base.json');

    expect(gitignore).toContain('dist/');
    expect(packageBuildBase.extends).toBe('./tsconfig.package-base.json');
    expect(packageBuildBase.compilerOptions).toMatchObject({
      declaration: true,
      declarationMap: true,
      emitDeclarationOnly: false,
      noEmit: false,
      noEmitOnError: true,
      sourceMap: true
    });
    expect(packageBuildBase.compilerOptions).not.toHaveProperty('outDir');

    for (const packagePath of packagePaths) {
      const buildConfig = jsonSource<PackageTsconfig>(`${packagePath}/tsconfig.build.json`);

      expect(buildConfig.extends).toMatch(/tsconfig\.package-build-base\.json$/);
      if (packagePath === 'packages/platform') {
        expect(buildConfig.compilerOptions).toEqual({ outDir: 'dist', rootDir: '.' });
      } else {
        expect(buildConfig.compilerOptions?.outDir).toBe('dist');
        expect(buildConfig.compilerOptions?.rootDir).toBe('.');
        expect(buildConfig.compilerOptions?.paths).toMatchObject({
          '@citadel/platform/app': ['packages/platform/dist/app.d.ts'],
          '@citadel/platform/client': ['packages/platform/dist/client.d.ts'],
          '@citadel/platform/server-app': ['packages/platform/dist/server-app.d.ts'],
          '@citadel/platform/persistence': ['packages/platform/dist/persistence.d.ts'],
          '@citadel/platform/server': ['packages/platform/dist/server.d.ts'],
          '@citadel/platform/validation': ['packages/platform/dist/validation.d.ts']
        });
      }
      expect(buildConfig.include?.join(' ')).not.toMatch(/\.\.|tests|packages\//);
    }
  });

  it('keeps workspace package entrypoints as thin source re-export shims', () => {
    expect(source('packages/platform/app.ts').trim()).toBe("export * from './src/app.js';");
    expect(source('packages/platform/client.ts').trim()).toBe("export * from './src/client.js';");
    expect(source('packages/platform/server-app.ts').trim()).toBe("export * from './src/serverApp.js';");
    expect(source('packages/platform/persistence.ts').trim()).toBe("export * from './src/persistence.js';");
    expect(source('packages/platform/server.ts').trim()).toBe("export * from './src/server.js';");
    expect(source('packages/platform/validation.ts').trim()).toBe("export * from './src/validation.js';");

    for (const appId of appIds) {
      expect(source(`packages/apps/${appId}/index.ts`).trim()).toBe("export * from './src/index.js';");
      expect(source(`packages/apps/${appId}/client.ts`).trim()).toBe("export * from './src/client.js';");
      expect(source(`packages/apps/${appId}/server.ts`).trim()).toBe("export * from './src/serverEntry.js';");
    }
    expect(source('packages/apps/chat/validation.ts').trim()).toBe("export * from './src/validation.js';");
  });

  it('removes legacy compatibility shim files', () => {
    for (const moduleName of platformEntrypointNames) {
      expect(exists(`src/platform/${moduleName}.ts`)).toBe(false);
    }

    for (const appId of appIds) {
      for (const fileName of appShimFilesById[appId]) {
        expect(exists(`src/apps/${appId}/${fileName}`)).toBe(false);
      }
    }

    for (const fileName of deletedCompatibilityPaths) {
      expect(exists(fileName)).toBe(false);
    }
  });

  it('keeps bundled app assembly on public app package surfaces', () => {
    const catalog = source('src/bundledApps/catalog.ts');
    const serverRegistry = source('src/bundledApps/serverRegistry.ts');

    for (const appId of appIds) {
      expect(catalog).toContain(`from '@citadel/app-${appId}'`);
      expect(catalog).not.toContain(`@citadel/apps/${appId}`);
      expect(serverRegistry).toContain(`from '@citadel/app-${appId}/server'`);
      expect(serverRegistry).not.toContain(`@citadel/apps/${appId}`);
    }
    expect(catalog).not.toMatch(/(?:\.\.\/apps|src\/apps|packages\/apps)\/(?:chat|chess|snake)\//);
    expect(serverRegistry).not.toMatch(/(?:\.\.\/apps|src\/apps|packages\/apps)\/(?:chat|chess|snake)\//);
  });
});
