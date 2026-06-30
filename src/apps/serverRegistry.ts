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

export function createBundledServerApps(services: ServerAppServices): ServerAppModule[] {
  const repositories = resolveBundledRepositories(services);

  return bundledServerAppBundles.map((bundle) =>
    bundle.createServerApp({
      ...services,
      ...repositories
    })
  );
}
