import type { ClientAppModule, ClientAppRegistration } from '@citadel/platform/client';
import type { SnakeState } from './shared.js';
import { SnakeView } from './SnakeView.js';
import { snakeManifest } from './manifest.js';

export const snakeClientApp = {
  appId: snakeManifest.appId,
  label: snakeManifest.label,
  defaultSpaceId: snakeManifest.defaultSpaceId,
  View: SnakeView
} satisfies ClientAppModule<SnakeState>;

export const snakeClientRegistration = {
  appId: snakeClientApp.appId,
  clientApp: snakeClientApp
} satisfies ClientAppRegistration<SnakeState>;
