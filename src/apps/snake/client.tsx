import type { ClientAppModule } from '../../client/appRegistry';
import type { SnakeState } from './shared';
import { SnakeView } from './SnakeView';

export const snakeClientApp = {
  appId: 'snake',
  label: 'Snake',
  defaultSpaceId: 'general',
  View: SnakeView
} satisfies ClientAppModule<SnakeState>;
