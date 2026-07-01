import type { AppId, AppManifest } from '@citadel/platform/app';
import { isAppId } from '@citadel/platform/app';
import type { ServerAppModule } from '@citadel/platform/server-app';
import {
  bundledAppIds,
  bundledAppManifests,
  orderBundledAppEntries
} from './catalog.js';
import {
  chatServerBundle,
  resolveChatRepository,
  type ChatRateLimitOptions,
  type ChatRepository,
  type ChatServerAppServices,
  type MessageStore
} from '@citadel/app-chat/server';
import {
  chessServerBundle,
  resolveChessRepository,
  type ChessRepository,
  type ChessServerAppServices
} from '@citadel/app-chess/server';
import { snakeServerBundle } from '@citadel/app-snake/server';
import type { ServerAppServices } from './serverServices.js';

export type { ChatRateLimitOptions } from '@citadel/app-chat/server';
export type { ServerAppServices } from './serverServices.js';

export type BundledServerAppServices = ServerAppServices & {
  chatRepository?: ChatRepository;
  chessRepository?: ChessRepository;
  messageStore?: MessageStore;
  messageRateLimit?: ChatRateLimitOptions;
  enabledAppIds?: AppId[];
};

export function resolveBundledRepositories(services: BundledServerAppServices) {
  return {
    chatRepository: resolveChatRepository(services),
    chessRepository: resolveChessRepository(services)
  };
}

export { bundledAppManifests } from './catalog.js';

type BundledServerAppBundle =
  | typeof chatServerBundle
  | typeof chessServerBundle
  | typeof snakeServerBundle;

type BundledRepositoryServices = ReturnType<typeof resolveBundledRepositories>;

type BundledServerAppDefinition = {
  appId: AppId;
  bundle: BundledServerAppBundle;
  createServerApp(services: BundledServerAppServices, repositories: BundledRepositoryServices): ServerAppModule;
};

const bundledServerAppDefinitions = orderBundledAppEntries({
  chat: {
    appId: chatServerBundle.appId,
    bundle: chatServerBundle,
    createServerApp(services: BundledServerAppServices, repositories: BundledRepositoryServices) {
      return chatServerBundle.createServerApp({
        database: services.database,
        chatRepository: repositories.chatRepository,
        messageStore: services.messageStore,
        messageRateLimit: services.messageRateLimit
      } satisfies ChatServerAppServices);
    }
  },
  chess: {
    appId: chessServerBundle.appId,
    bundle: chessServerBundle,
    createServerApp(services: BundledServerAppServices, repositories: BundledRepositoryServices) {
      return chessServerBundle.createServerApp({
        database: services.database,
        chessRepository: repositories.chessRepository
      } satisfies ChessServerAppServices);
    }
  },
  snake: {
    appId: snakeServerBundle.appId,
    bundle: snakeServerBundle,
    createServerApp(services: BundledServerAppServices) {
      return snakeServerBundle.createServerApp({
        database: services.database
      } satisfies ServerAppServices);
    }
  }
}) satisfies BundledServerAppDefinition[];

export const bundledServerAppBundles = bundledServerAppDefinitions.map((definition) => definition.bundle);

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
  return filterServerAppDefinitions(enabledAppIds).map((definition) => definition.bundle);
}

export function filterAppManifests(enabledAppIds: AppId[]) {
  return enabledAppIds
    .map((appId) => bundledAppManifests.find((manifest) => manifest.appId === appId))
    .filter((manifest): manifest is AppManifest => Boolean(manifest));
}

function filterServerAppDefinitions(enabledAppIds: AppId[]) {
  return enabledAppIds
    .map((appId) => bundledServerAppDefinitions.find((definition) => definition.appId === appId))
    .filter((definition): definition is (typeof bundledServerAppDefinitions)[number] => Boolean(definition));
}

export function createBundledServerApps(services: BundledServerAppServices): ServerAppModule[] {
  const repositories = resolveBundledRepositories(services);
  const definitions = services.enabledAppIds
    ? filterServerAppDefinitions(services.enabledAppIds)
    : bundledServerAppDefinitions;

  return definitions.map((definition) => definition.createServerApp(services, repositories));
}
