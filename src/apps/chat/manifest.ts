import type { AppManifest } from '../../platform/appContract.js';

export const chatManifest = {
  appId: 'chat',
  label: 'Chat',
  defaultSpaceId: 'general',
  persistence: 'sqlite',
  version: '0.1.0'
} satisfies AppManifest;
