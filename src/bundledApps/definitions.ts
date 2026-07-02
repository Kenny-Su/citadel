import type { AppId, AppManifest, AppPackageDescriptor } from '@citadel/platform/app';
import { bundledInstalledApps } from './generatedAppCatalog.js';

export type BundledAppDefinition = AppPackageDescriptor;

export const bundledAppDefinitions: BundledAppDefinition[] =
  bundledInstalledApps.map((app) => app.descriptor);

export const bundledAppIds: AppId[] = bundledAppDefinitions.map((definition) => definition.appId);

export const bundledAppManifests: AppManifest[] = bundledAppDefinitions.map((definition) => definition.manifest);

export function getBundledAppDefinition(appId: AppId): BundledAppDefinition | undefined {
  return bundledAppDefinitions.find((definition) => definition.appId === appId);
}

export function getBundledAppManifest(appId: AppId): AppManifest | undefined {
  return getBundledAppDefinition(appId)?.manifest;
}

export function orderBundledAppEntries<T>(entriesById: Record<string, T>) {
  return bundledAppDefinitions.map((definition) => entriesById[definition.appId]) as T[];
}
