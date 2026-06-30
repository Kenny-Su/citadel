import type { ClientAppModule } from '../../client/appRegistry';
import type { ChessState } from './shared';
import { ChessView } from './ChessView';

export const chessClientApp = {
  appId: 'chess',
  label: 'Chess',
  defaultSpaceId: 'general',
  View: ChessView
} satisfies ClientAppModule<ChessState>;
