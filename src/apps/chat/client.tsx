import type { ClientAppModule } from '../../client/appRegistry';
import type { ChatState } from './shared';
import { ChatView } from './ChatView';

export const chatClientApp = {
  appId: 'chat',
  label: 'Chat',
  defaultSpaceId: 'general',
  View: ChatView
} satisfies ClientAppModule<ChatState>;
