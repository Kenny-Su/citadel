import type { ServerAppBundle, ServerAppServices } from '../../platform/serverApp.js';
import { snakeManifest } from './manifest.js';
import { createSnakeApp } from './server.js';

export const snakeServerBundle = {
  appId: snakeManifest.appId,
  createServerApp(_services) {
    return createSnakeApp();
  }
} satisfies ServerAppBundle<ServerAppServices>;
