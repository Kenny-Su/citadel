import type { AppId, AppManifest, AppPackageDescriptor } from '@citadel/platform/app';
import { chatAppPackage } from '@citadel/app-chat';
import { chessAppPackage } from '@citadel/app-chess';
import { snakeAppPackage } from '@citadel/app-snake';

export type BundledAppDefinition = AppPackageDescriptor;

export const bundledAppDefinitions: BundledAppDefinition[] = [
  chatAppPackage,
  chessAppPackage,
  snakeAppPackage
] satisfies BundledAppDefinition[];

export const bundledAppIds: AppId[] = bundledAppDefinitions.map((definition) => definition.appId);

export const bundledAppManifests: AppManifest[] = bundledAppDefinitions.map((definition) => definition.manifest);

export function getBundledAppDefinition(appId: AppId): BundledAppDefinition | undefined {
  return bundledAppDefinitions.find((definition) => definition.appId === appId);
}

export function getBundledAppManifest(appId: AppId): AppManifest | undefined {
  return getBundledAppDefinition(appId)?.manifest;
}

export function orderBundledAppEntries<T extends Record<AppId, unknown>>(entriesById: T) {
  return bundledAppDefinitions.map((definition) => entriesById[definition.appId]) as Array<T[AppId]>;
}
