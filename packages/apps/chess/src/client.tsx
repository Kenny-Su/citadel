import type { ClientAppModule, ClientAppRegistration } from '@citadel/platform/client';
import type { ChessState } from './shared.js';
import { ChessView } from './ChessView.js';
import { chessManifest } from './manifest.js';

export const chessClientApp = {
  appId: chessManifest.appId,
  label: chessManifest.label,
  defaultSpaceId: chessManifest.defaultSpaceId,
  View: ChessView
} satisfies ClientAppModule<ChessState>;

export const chessClientRegistration = {
  appId: chessClientApp.appId,
  clientApp: chessClientApp
} satisfies ClientAppRegistration<ChessState>;
