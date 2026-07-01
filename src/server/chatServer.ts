import { createPlatformServer, type PlatformServerOptions } from '@citadel/platform/server';
import type { AppId } from '@citadel/platform/app';
import { createBundledServerApps, filterAppManifests } from '../bundledApps/serverRegistry.js';
import { openCitadelDatabase, type CitadelDatabase } from '@citadel/platform/persistence';
import {
  resolveLegacyAppRepositories,
  type ChatRepository,
  type ChessRepository,
  type MessageStore
} from './legacyAppRepositories.js';

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
  const {
    chatRepository,
    chessRepository,
    messageStore
  } = resolveLegacyAppRepositories(services);
  const appManifests = services.enabledAppIds ? filterAppManifests(services.enabledAppIds) : undefined;

  return {
    ...createPlatformServer({
      clientOrigin,
      staticDir: typeof options === 'string' ? undefined : options.staticDir,
      appManifests,
      apps: createBundledServerApps({
        ...services,
        chatRepository,
        chessRepository
      })
    }),
    database,
    messageStore,
    chatRepository,
    chessRepository
  };
}
