import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..');
const configPath = join(rootDir, 'bundled-apps.json');
const rootPackagePath = join(rootDir, 'package.json');
const outputs = [
  {
    path: join(rootDir, 'src/bundledApps/generatedResolver.ts'),
    generate: generateDescriptorResolver
  },
  {
    path: join(rootDir, 'src/client/generatedAppRegistry.ts'),
    generate: generateClientRegistry
  },
  {
    path: join(rootDir, 'src/bundledApps/generatedServerRegistry.ts'),
    generate: generateServerRegistry
  }
];
const checkOnly = process.argv.includes('--check');

function readConfig() {
  const config = JSON.parse(readFileSync(configPath, 'utf8'));

  if (!config || typeof config !== 'object' || !Array.isArray(config.packages)) {
    throw new Error('bundled-apps.json must contain a packages array');
  }

  if (!config.packages.every((packageName) => typeof packageName === 'string')) {
    throw new Error('bundled-apps.json packages must contain only strings');
  }

  return config;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function readWorkspacePackageManifests() {
  const rootPackage = readJson(rootPackagePath);
  const workspaces = Array.isArray(rootPackage.workspaces) ? rootPackage.workspaces : [];

  return new Map(workspaces.map((workspacePath) => {
    const packageJsonPath = join(rootDir, workspacePath, 'package.json');
    const packageJson = readJson(packageJsonPath);

    return [packageJson.name, { packageJson, packageJsonPath }];
  }));
}

function resolveAppPackages(config) {
  const workspacePackages = readWorkspacePackageManifests();
  const seenAppIds = new Set();

  return config.packages.map((packageName) => {
    const manifest = workspacePackages.get(packageName);

    if (!manifest) {
      throw new Error(`Bundled app package ${packageName} was not found in root workspaces`);
    }

    const descriptor = parseCitadelPackageMetadata(packageName, manifest.packageJson);

    if (seenAppIds.has(descriptor.appId)) {
      throw new Error(`Duplicate bundled app id: ${descriptor.appId}`);
    }

    seenAppIds.add(descriptor.appId);
    return descriptor;
  });
}

function parseCitadelPackageMetadata(packageName, packageJson) {
  if (packageJson.name !== packageName) {
    throw new Error(`Bundled app package mismatch: configured ${packageName}, package.json declares ${packageJson.name}`);
  }

  const metadata = packageJson.citadel;

  if (!metadata || typeof metadata !== 'object') {
    throw new Error(`Bundled app package ${packageName} must declare citadel metadata`);
  }

  const descriptor = {
    appId: readRequiredString(metadata, 'appId', packageName),
    manifest: {
      appId: readRequiredString(metadata, 'appId', packageName),
      label: readRequiredString(metadata, 'label', packageName),
      defaultSpaceId: readRequiredString(metadata, 'defaultSpaceId', packageName),
      persistence: readPersistence(metadata, packageName),
      version: readRequiredString(metadata, 'version', packageName)
    },
    packageName,
    client: readRegistrationMetadata(metadata, 'client', packageName),
    server: readRegistrationMetadata(metadata, 'server', packageName)
  };

  return descriptor;
}

function readRequiredString(metadata, key, packageName) {
  const value = metadata[key];

  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`Bundled app package ${packageName} citadel.${key} must be a non-empty string`);
  }

  return value;
}

function readPersistence(metadata, packageName) {
  const value = readRequiredString(metadata, 'persistence', packageName);

  if (value !== 'none' && value !== 'sqlite') {
    throw new Error(`Bundled app package ${packageName} citadel.persistence must be "none" or "sqlite"`);
  }

  return value;
}

function readRegistrationMetadata(metadata, environment, packageName) {
  const registration = metadata[environment];

  if (!registration || typeof registration !== 'object') {
    throw new Error(`Bundled app package ${packageName} citadel.${environment} must declare registration metadata`);
  }

  return {
    subpath: readSubpath(registration, environment, packageName),
    registrationExport: readRequiredString(registration, 'registrationExport', packageName)
  };
}

function readSubpath(registration, environment, packageName) {
  const subpath = readRequiredString(registration, 'subpath', packageName);

  if (subpath !== '.' && !subpath.startsWith('./')) {
    throw new Error(`Bundled app package ${packageName} citadel.${environment}.subpath must be "." or start with "./"`);
  }

  return subpath;
}

function importPath(packageName, subpath) {
  return subpath === '.' ? packageName : `${packageName}/${subpath.slice(2)}`;
}

function literal(value) {
  return JSON.stringify(value);
}

function generateDescriptorLiteral(appPackage) {
  return [
    '{',
    `  appId: ${literal(appPackage.appId)},`,
    '  manifest: {',
    `    appId: ${literal(appPackage.manifest.appId)},`,
    `    label: ${literal(appPackage.manifest.label)},`,
    `    defaultSpaceId: ${literal(appPackage.manifest.defaultSpaceId)},`,
    `    persistence: ${literal(appPackage.manifest.persistence)},`,
    `    version: ${literal(appPackage.manifest.version)}`,
    '  },',
    `  packageName: ${literal(appPackage.packageName)},`,
    '  client: {',
    `    subpath: ${literal(appPackage.client.subpath)},`,
    `    registrationExport: ${literal(appPackage.client.registrationExport)}`,
    '  },',
    '  server: {',
    `    subpath: ${literal(appPackage.server.subpath)},`,
    `    registrationExport: ${literal(appPackage.server.registrationExport)}`,
    '  }',
    '}'
  ].join('\n');
}

function generateDescriptorResolver(appPackages) {
  const entries = appPackages.map((appPackage) => (
    `  ${literal(appPackage.packageName)}: ${generateDescriptorLiteral(appPackage).replace(/\n/g, '\n  ')}`
  ));

  return [
    '// Generated by scripts/generate-bundled-apps.mjs. Do not edit by hand.',
    "import type { AppPackageDescriptor } from '@citadel/platform/app';",
    '',
    'export const bundledAppDescriptorByPackageName: Record<string, AppPackageDescriptor> = {',
    entries.join(',\n'),
    '};',
    ''
  ].join('\n');
}

function generateClientRegistry(appPackages) {
  const imports = appPackages.map((appPackage, index) => (
    `import { ${appPackage.client.registrationExport} as bundledClientRegistration${index} } from '${importPath(appPackage.packageName, appPackage.client.subpath)}';`
  ));
  const entries = appPackages.map((appPackage, index) => (
    `  ${literal(appPackage.packageName)}: bundledClientRegistration${index}`
  ));

  return [
    '// Generated by scripts/generate-bundled-apps.mjs. Do not edit by hand.',
    "import type { ClientAppRegistration } from '@citadel/platform/client';",
    ...imports,
    '',
    'export const bundledClientRegistrationByPackageName: Record<string, ClientAppRegistration<any>> = {',
    entries.join(',\n'),
    '};',
    ''
  ].join('\n');
}

function generateServerRegistry(appPackages) {
  const imports = appPackages.map((appPackage, index) => (
    `import { ${appPackage.server.registrationExport} as bundledServerRegistration${index} } from '${importPath(appPackage.packageName, appPackage.server.subpath)}';`
  ));
  const entries = appPackages.map((appPackage, index) => (
    `  ${literal(appPackage.packageName)}: bundledServerRegistration${index}`
  ));

  return [
    '// Generated by scripts/generate-bundled-apps.mjs. Do not edit by hand.',
    "import type { ServerAppRegistration } from '@citadel/platform/server-app';",
    ...imports,
    '',
    'export const bundledServerRegistrationByPackageName: Record<string, ServerAppRegistration<any>> = {',
    entries.join(',\n'),
    '};',
    ''
  ].join('\n');
}

const config = readConfig();
const appPackages = resolveAppPackages(config);

if (checkOnly) {
  for (const output of outputs) {
    if (!existsSync(output.path)) {
      throw new Error(`${relative(rootDir, output.path)} is missing. Run npm run generate:bundled-apps.`);
    }

    const currentSource = readFileSync(output.path, 'utf8');
    const nextSource = output.generate(appPackages);

    if (currentSource !== nextSource) {
      throw new Error(`${relative(rootDir, output.path)} is stale. Run npm run generate:bundled-apps.`);
    }
  }
} else {
  for (const output of outputs) {
    writeFileSync(output.path, output.generate(appPackages));
  }
}
