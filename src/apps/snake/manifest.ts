import type { AppManifest } from '@citadel/platform/app';

export const snakeManifest = {
  appId: 'snake',
  label: 'Snake',
  defaultSpaceId: 'general',
  persistence: 'none',
  version: '0.1.0'
} satisfies AppManifest;
