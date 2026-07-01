import type { AppId, AppManifest } from '@citadel/platform/app';
import { chatManifest } from '@citadel/app-chat';
import { chessManifest } from '@citadel/app-chess';
import { snakeManifest } from '@citadel/app-snake';

export type BundledAppDefinition = {
  appId: AppId;
  manifest: AppManifest;
};

export const bundledAppDefinitions: BundledAppDefinition[] = [
  { appId: chatManifest.appId, manifest: chatManifest },
  { appId: chessManifest.appId, manifest: chessManifest },
  { appId: snakeManifest.appId, manifest: snakeManifest }
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
