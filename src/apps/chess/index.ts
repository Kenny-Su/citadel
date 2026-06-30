import type { ServerAppBundle } from '../../platform/appContract.js';
import type { ServerAppServices } from '../serverRegistry.js';
import { createChessRepository } from './repository.js';
import { createChessApp } from './server.js';
import { chessManifest } from './manifest.js';

export {
  createChessRepository,
  type ChessRepository,
  type PersistedChessGame,
  type PersistedChessMove
} from './repository.js';
export { chessManifest } from './manifest.js';

export function resolveChessRepository(services: ServerAppServices) {
  return services.chessRepository ?? createChessRepository(services.database.database);
}

export const chessServerBundle = {
  appId: chessManifest.appId,
  createServerApp(services) {
    return createChessApp({
      repository: resolveChessRepository(services)
    });
  }
} satisfies ServerAppBundle<ServerAppServices>;
