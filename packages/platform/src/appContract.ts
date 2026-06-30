import type { AppId } from '../../../src/shared/platform.js';

export type AppManifest = {
  appId: AppId;
  label: string;
  defaultSpaceId: string;
  persistence: 'none' | 'sqlite';
  version: string;
};
