import type { ClientAppModule } from '../../platform/client.js';
import type { SnakeState } from './shared.js';
import { SnakeView } from './SnakeView.js';
import { snakeManifest } from './manifest.js';

export const snakeClientApp = {
  appId: snakeManifest.appId,
  label: snakeManifest.label,
  defaultSpaceId: snakeManifest.defaultSpaceId,
  View: SnakeView
} satisfies ClientAppModule<SnakeState>;
