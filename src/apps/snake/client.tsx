import type { ClientAppModule } from '../../client/appRegistry.js';
import type { SnakeState } from './shared.js';
import { SnakeView } from './SnakeView.js';

export const snakeClientApp = {
  appId: 'snake',
  label: 'Snake',
  defaultSpaceId: 'general',
  View: SnakeView
} satisfies ClientAppModule<SnakeState>;
