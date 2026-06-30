import type { AppId } from '../shared/platform.js';
import { isAppId } from '../shared/platform.js';
import type { ServerAppModule, ServerAppBundle } from '../platform/appContract.js';
import type { CitadelDatabase } from '../persistence/sqlite.js';
import type { ChatRepository, MessageStore } from './chat/index.js';
import type { ChessRepository } from './chess/index.js';
import { chatServerBundle, resolveChatRepository } from './chat/index.js';
import { chessServerBundle, resolveChessRepository } from './chess/index.js';
import { snakeServerBundle } from './snake/index.js';

export type ChatRateLimitOptions = {
  maxMessages: number;
  windowMs: number;
};

export type ServerAppServices = {
  database: CitadelDatabase;
  chatRepository?: ChatRepository;
  chessRepository?: ChessRepository;
  messageStore?: MessageStore;
  messageRateLimit?: ChatRateLimitOptions;
  enabledAppIds?: AppId[];
};

export function resolveBundledRepositories(services: ServerAppServices) {
  return {
    chatRepository: resolveChatRepository(services),
    chessRepository: resolveChessRepository(services)
  };
}

export const bundledServerAppBundles = [
  chatServerBundle,
  chessServerBundle,
  snakeServerBundle
] satisfies ServerAppBundle<ServerAppServices>[];

const allBundledAppIds = bundledServerAppBundles.map((bundle) => bundle.appId);

export function getEnabledAppIds(input?: string): AppId[] {
  if (!input?.trim()) {
    return [...allBundledAppIds];
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

  return enabledAppIds.length > 0 ? enabledAppIds : [...allBundledAppIds];
}

export function filterServerAppBundles(enabledAppIds: AppId[]) {
  return enabledAppIds
    .map((appId) => bundledServerAppBundles.find((bundle) => bundle.appId === appId))
    .filter((bundle): bundle is (typeof bundledServerAppBundles)[number] => Boolean(bundle));
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
