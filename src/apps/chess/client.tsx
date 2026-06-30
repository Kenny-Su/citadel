import type { ClientAppModule } from '../../client/appRegistry.js';
import type { ChessState } from './shared.js';
import { ChessView } from './ChessView.js';

export const chessClientApp = {
  appId: 'chess',
  label: 'Chess',
  defaultSpaceId: 'general',
  View: ChessView
} satisfies ClientAppModule<ChessState>;
