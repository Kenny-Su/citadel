import type { ServerAppBundle } from '../../platform/serverAppContract.js';
import type { ServerAppServices } from '../serverServices.js';
import { chatManifest } from './manifest.js';
import { createChatRepository } from './messageStore.js';
import { createChatApp } from './server.js';

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
  appId: chatManifest.appId,
  createServerApp(services) {
    return createChatApp({
      repository: resolveChatRepository(services),
      messageRateLimit: services.messageRateLimit
    });
  }
} satisfies ServerAppBundle<ServerAppServices>;
