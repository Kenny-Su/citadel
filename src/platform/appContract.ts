import type { AppId } from '../shared/platform.js';

export type AppManifest = {
  appId: AppId;
  label: string;
  defaultSpaceId: string;
  persistence: 'none' | 'sqlite';
  version: string;
};
