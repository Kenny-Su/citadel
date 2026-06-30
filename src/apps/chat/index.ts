import type { ServerAppBundle } from '../../platform/appContract.js';
import type { ServerAppServices } from '../serverServices.js';
import { createChatApp } from './server.js';
import { createChatRepository } from './messageStore.js';
import { chatManifest } from './manifest.js';

export { chatClientApp } from './client.js';
export {
  createChatRepository,
  createSqliteMessageStore,
  type ChatRepository,
  type MessageStore
} from './messageStore.js';
export { chatManifest } from './manifest.js';
export type {
  ChatMessage,
  ChatState,
  ChatSystemEvent,
  ChatTimelineItem,
  SendMessagePayload,
  TypingUpdatePayload
} from './shared.js';

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
