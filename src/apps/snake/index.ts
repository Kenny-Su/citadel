import type { ServerAppBundle } from '../../platform/appContract.js';
import type { ServerAppServices } from '../serverRegistry.js';
import { createSnakeApp } from './server.js';

export const snakeServerBundle = {
  appId: 'snake',
  createServerApp() {
    return createSnakeApp();
  }
} satisfies ServerAppBundle<ServerAppServices>;
