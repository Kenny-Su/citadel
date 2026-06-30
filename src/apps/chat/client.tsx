import type { ClientAppModule } from '../../client/appRegistry.js';
import type { ChatState } from './shared.js';
import { ChatView } from './ChatView.js';
import { chatManifest } from './manifest.js';

export const chatClientApp = {
  appId: chatManifest.appId,
  label: chatManifest.label,
  defaultSpaceId: chatManifest.defaultSpaceId,
  View: ChatView
} satisfies ClientAppModule<ChatState>;
