import type { ClientAppModule, ClientAppRegistration } from '@citadel/platform/client';
import type { ChatState } from './shared.js';
import { ChatView } from './ChatView.js';
import { chatManifest } from './manifest.js';

export const chatClientApp = {
  appId: chatManifest.appId,
  label: chatManifest.label,
  defaultSpaceId: chatManifest.defaultSpaceId,
  View: ChatView
} satisfies ClientAppModule<ChatState>;

export const chatClientRegistration = {
  appId: chatClientApp.appId,
  clientApp: chatClientApp
} satisfies ClientAppRegistration<ChatState>;
