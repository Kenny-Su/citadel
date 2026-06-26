import { createPlatformServer, type PlatformServerOptions } from '../platform/server.js';
import { createChatApp } from '../apps/chat/server.js';
import { createSqliteMessageStore, type MessageStore } from '../apps/chat/messageStore.js';
import { createChessApp } from '../apps/chess/server.js';
import { createSnakeApp } from '../apps/snake/server.js';

export type ChatServerOptions = Omit<PlatformServerOptions, 'apps'> & {
  messageStore?: MessageStore;
  messageRateLimit?: {
    maxMessages: number;
    windowMs: number;
  };
};

export function createChatServer(options: ChatServerOptions | string = {}) {
  const clientOrigin =
    typeof options === 'string' ? options : (options.clientOrigin ?? 'http://localhost:5173');
  const messageStore =
    typeof options === 'string'
      ? createSqliteMessageStore(process.env.CHAT_DB_PATH ?? 'data/citadel.sqlite')
      : (options.messageStore ??
        createSqliteMessageStore(process.env.CHAT_DB_PATH ?? process.env.CITADEL_DB_PATH ?? 'data/citadel.sqlite'));

  return {
    ...createPlatformServer({
      clientOrigin,
      staticDir: typeof options === 'string' ? undefined : options.staticDir,
      apps: [
        createChatApp({
          messageStore,
          messageRateLimit: typeof options === 'string' ? undefined : options.messageRateLimit
        }),
        createChessApp(),
        createSnakeApp()
      ]
    }),
    messageStore
  };
}
