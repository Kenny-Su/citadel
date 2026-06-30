import type { AppId } from '../shared/platform.js';
import { isAppId } from '../shared/platform.js';
import type { AppManifest } from '../platform/appContract.js';
import type { ServerAppModule, ServerAppBundle } from '../platform/serverAppContract.js';
import {
  bundledAppIds,
  bundledAppManifests,
  orderBundledAppEntries
} from './catalog.js';
import {
  chatServerBundle,
  resolveChatRepository,
  type ChatRepository,
  type MessageStore
} from './chat/serverEntry.js';
import {
  chessServerBundle,
  resolveChessRepository,
  type ChessRepository
} from './chess/serverEntry.js';
import { snakeServerBundle } from './snake/serverEntry.js';
import type { ChatRateLimitOptions, ServerAppServices } from './serverServices.js';

export type { ChatRateLimitOptions, ServerAppServices } from './serverServices.js';

export function resolveBundledRepositories(services: ServerAppServices) {
  return {
    chatRepository: resolveChatRepository(services),
    chessRepository: resolveChessRepository(services)
  };
}

export { bundledAppManifests } from './catalog.js';

export const bundledServerAppBundles = orderBundledAppEntries({
  chat: chatServerBundle,
  chess: chessServerBundle,
  snake: snakeServerBundle
}) satisfies ServerAppBundle<ServerAppServices>[];

export function getEnabledAppIds(input?: string): AppId[] {
  if (!input?.trim()) {
    return [...bundledAppIds];
  }

  const enabledAppIds: AppId[] = [];
  const seen = new Set<AppId>();

  for (const token of input.split(',')) {
    const appId = token.trim();

    if (!isAppId(appId) || seen.has(appId)) {
      continue;
    }

    enabledAppIds.push(appId);
    seen.add(appId);
  }

  return enabledAppIds.length > 0 ? enabledAppIds : [...bundledAppIds];
}

export function filterServerAppBundles(enabledAppIds: AppId[]) {
  return enabledAppIds
    .map((appId) => bundledServerAppBundles.find((bundle) => bundle.appId === appId))
    .filter((bundle): bundle is (typeof bundledServerAppBundles)[number] => Boolean(bundle));
}

export function filterAppManifests(enabledAppIds: AppId[]) {
  return enabledAppIds
    .map((appId) => bundledAppManifests.find((manifest) => manifest.appId === appId))
    .filter((manifest): manifest is AppManifest => Boolean(manifest));
}

export function createBundledServerApps(services: ServerAppServices): ServerAppModule[] {
  const repositories = resolveBundledRepositories(services);
  const bundles = services.enabledAppIds
    ? filterServerAppBundles(services.enabledAppIds)
    : bundledServerAppBundles;

  return bundles.map((bundle) =>
    bundle.createServerApp({
      ...services,
      ...repositories
    })
  );
}
