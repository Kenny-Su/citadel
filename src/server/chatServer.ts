import { createPlatformServer, type PlatformServerOptions } from '../platform/server.js';
import type { AppId } from '../shared/platform.js';
import { type ChatRepository, type MessageStore } from '../apps/chat/index.js';
import { type ChessRepository } from '../apps/chess/index.js';
import { createBundledServerApps, resolveBundledRepositories } from '../apps/serverRegistry.js';
import { openCitadelDatabase, type CitadelDatabase } from '../persistence/sqlite.js';

export type ChatServerOptions = Omit<PlatformServerOptions, 'apps'> & {
  database?: CitadelDatabase;
  chatRepository?: ChatRepository;
  chessRepository?: ChessRepository;
  messageStore?: MessageStore;
  messageRateLimit?: {
    maxMessages: number;
    windowMs: number;
  };
  enabledAppIds?: AppId[];
};

export function createChatServer(options: ChatServerOptions | string = {}) {
  const clientOrigin =
    typeof options === 'string' ? options : (options.clientOrigin ?? 'http://localhost:5173');
  const database =
    typeof options === 'string'
      ? openCitadelDatabase(process.env.CHAT_DB_PATH ?? 'data/citadel.sqlite')
      : (options.database ??
        openCitadelDatabase(process.env.CHAT_DB_PATH ?? process.env.CITADEL_DB_PATH ?? 'data/citadel.sqlite'));
  const services = {
    database,
    chatRepository: typeof options === 'string' ? undefined : options.chatRepository,
    chessRepository: typeof options === 'string' ? undefined : options.chessRepository,
    messageStore: typeof options === 'string' ? undefined : options.messageStore,
    messageRateLimit: typeof options === 'string' ? undefined : options.messageRateLimit,
    enabledAppIds: typeof options === 'string' ? undefined : options.enabledAppIds
  };
  const { chatRepository, chessRepository } = resolveBundledRepositories(services);

  return {
    ...createPlatformServer({
      clientOrigin,
      staticDir: typeof options === 'string' ? undefined : options.staticDir,
      apps: createBundledServerApps({
        ...services,
        chatRepository,
        chessRepository
      })
    }),
    database,
    messageStore: chatRepository,
    chatRepository,
    chessRepository
  };
}
