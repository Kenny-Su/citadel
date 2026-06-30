import type { AppId } from '../shared/platform.js';
import type { ServerAppModule } from '../platform/server.js';
import type { CitadelDatabase } from '../persistence/sqlite.js';
import { createChatApp } from './chat/server.js';
import { createChatRepository, type ChatRepository, type MessageStore } from './chat/messageStore.js';
import { createChessApp } from './chess/server.js';
import { createChessRepository, type ChessRepository } from './chess/repository.js';
import { createSnakeApp } from './snake/server.js';

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

export type ServerAppBundle = {
  appId: AppId;
  createServerApp(services: ServerAppServices): ServerAppModule;
};

export function resolveBundledRepositories(services: ServerAppServices) {
  const chatRepository =
    services.chatRepository ?? services.messageStore ?? createChatRepository(services.database.database);
  const chessRepository =
    services.chessRepository ?? createChessRepository(services.database.database);

  return {
    chatRepository,
    chessRepository
  };
}

export const bundledServerAppBundles = [
  {
    appId: 'chat',
    createServerApp(services) {
      const { chatRepository } = resolveBundledRepositories(services);

      return createChatApp({
        repository: chatRepository,
        messageRateLimit: services.messageRateLimit
      });
    }
  },
  {
    appId: 'chess',
    createServerApp(services) {
      const { chessRepository } = resolveBundledRepositories(services);

      return createChessApp({
        repository: chessRepository
      });
    }
  },
  {
    appId: 'snake',
    createServerApp() {
      return createSnakeApp();
    }
  }
] satisfies ServerAppBundle[];

export function createBundledServerApps(services: ServerAppServices): ServerAppModule[] {
  const repositories = resolveBundledRepositories(services);

  return bundledServerAppBundles.map((bundle) =>
    bundle.createServerApp({
      ...services,
      ...repositories
    })
  );
}
