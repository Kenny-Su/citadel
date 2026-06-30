import type { ServerAppBundle } from '../../platform/appContract.js';
import type { ServerAppServices } from '../serverServices.js';
import { createSnakeApp } from './server.js';
import { snakeManifest } from './manifest.js';

export { snakeClientApp } from './client.js';
export { snakeManifest } from './manifest.js';
export type {
  SnakeDirection,
  SnakeDirectionPayload,
  SnakePlayer,
  SnakeSegment,
  SnakeState
} from './shared.js';

export const snakeServerBundle = {
  appId: snakeManifest.appId,
  createServerApp() {
    return createSnakeApp();
  }
} satisfies ServerAppBundle<ServerAppServices>;
