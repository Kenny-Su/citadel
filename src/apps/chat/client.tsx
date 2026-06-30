import type { ClientAppModule } from '../../client/appRegistry.js';
import type { ChatState } from './shared.js';
import { ChatView } from './ChatView.js';

export const chatClientApp = {
  appId: 'chat',
  label: 'Chat',
  defaultSpaceId: 'general',
  View: ChatView
} satisfies ClientAppModule<ChatState>;
