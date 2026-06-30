import type { ServerAppBundle } from '../../platform/appContract.js';
import type { ServerAppServices } from '../serverRegistry.js';
import { createChatApp } from './server.js';
import { createChatRepository } from './messageStore.js';

export {
  createChatRepository,
  createSqliteMessageStore,
  type ChatRepository,
  type MessageStore
} from './messageStore.js';

export function resolveChatRepository(services: ServerAppServices) {
  return services.chatRepository ?? services.messageStore ?? createChatRepository(services.database.database);
}

export const chatServerBundle = {
  appId: 'chat',
  createServerApp(services) {
    return createChatApp({
      repository: resolveChatRepository(services),
      messageRateLimit: services.messageRateLimit
    });
  }
} satisfies ServerAppBundle<ServerAppServices>;
