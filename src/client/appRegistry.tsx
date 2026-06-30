import type { AppManifest, ClientAppModule } from '../platform/appContract';
import type { AppEventEnvelope, AppId } from '../shared/platform';
import {
  chatClientApp,
  type ChatState
} from '../apps/chat';
import {
  chessClientApp,
  type ChessState
} from '../apps/chess';
import {
  snakeClientApp,
  type SnakeState
} from '../apps/snake';

export type { AppViewProps, ClientAppModule } from '../platform/appContract';

export const allClientApps = [chatClientApp, chessClientApp, snakeClientApp] satisfies ClientAppModule<any>[];

export const clientApps = allClientApps;

export const appById = new Map<AppId, ClientAppModule<any>>(allClientApps.map((app) => [app.appId, app]));

export function filterClientApps(enabledAppIds: AppId[]) {
  const enabled = new Set(enabledAppIds);
  const apps = allClientApps.filter((app) => enabled.has(app.appId));

  return apps.length > 0 ? apps : allClientApps;
}

export function createClientAppsFromManifests(
  manifests: unknown,
  enabledAppIds?: AppId[]
): ClientAppModule<any>[] | null {
  if (!Array.isArray(manifests)) {
    return null;
  }

  const enabled = enabledAppIds ? new Set(enabledAppIds) : null;
  const seen = new Set<AppId>();
  const apps: ClientAppModule<any>[] = [];

  for (const manifest of manifests) {
    if (!isClientManifest(manifest) || seen.has(manifest.appId)) {
      continue;
    }

    if (enabled && !enabled.has(manifest.appId)) {
      continue;
    }

    const localApp = appById.get(manifest.appId);

    if (!localApp) {
      continue;
    }

    apps.push({
      appId: manifest.appId,
      label: manifest.label,
      defaultSpaceId: manifest.defaultSpaceId,
      View: localApp.View
    });
    seen.add(manifest.appId);
  }

  return apps.length > 0 ? apps : null;
}

function isClientManifest(value: unknown): value is Pick<AppManifest, 'appId' | 'label' | 'defaultSpaceId'> {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const manifest = value as Partial<AppManifest>;

  return (
    manifest.appId === 'chat' ||
    manifest.appId === 'chess' ||
    manifest.appId === 'snake'
  ) && typeof manifest.label === 'string' && typeof manifest.defaultSpaceId === 'string';
}

export type KnownAppState = ChatState | ChessState | SnakeState;

export function isKnownAppEvent(event: unknown): event is AppEventEnvelope {
  return Boolean(event && typeof event === 'object' && 'appId' in event && 'type' in event);
}
