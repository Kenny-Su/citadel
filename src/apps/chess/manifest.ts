import type { AppManifest } from '../../platform/app.js';

export const chessManifest = {
  appId: 'chess',
  label: 'Chess',
  defaultSpaceId: 'general',
  persistence: 'sqlite',
  version: '0.1.0'
} satisfies AppManifest;
