import { describe, expect, it } from 'vitest';
import { bundledAppIds } from '../../src/bundledApps/catalog';
import {
  allClientApps,
  createClientAppsFromManifests,
  filterClientApps
} from '../../src/client/appRegistry';
import { chatClientRegistration } from '@citadel/app-chat/client';
import { chessClientRegistration } from '@citadel/app-chess/client';
import { snakeClientRegistration } from '@citadel/app-snake/client';

describe('client app registry', () => {
  it('exposes bundled client app modules in app order', () => {
    expect(allClientApps.map((app) => app.appId)).toEqual(bundledAppIds);
  });

  it('exposes public client registrations in app order', () => {
    const registrations = [
      chatClientRegistration,
      chessClientRegistration,
      snakeClientRegistration
    ];

    expect(registrations.map((registration) => registration.appId)).toEqual([
      'chat',
      'chess',
      'snake'
    ]);
    expect(registrations.map((registration) => registration.clientApp.appId)).toEqual([
      'chat',
      'chess',
      'snake'
    ]);
  });

  it('filters client apps by enabled app ids with the existing fallback', () => {
    expect(filterClientApps(['snake', 'chat']).map((app) => app.appId)).toEqual([
      'chat',
      'snake'
    ]);
    expect(filterClientApps([]).map((app) => app.appId)).toEqual(bundledAppIds);
  });

  it('creates client apps from server manifests using local views', () => {
    const manifests = [
      { appId: 'snake', label: 'Snake from server', defaultSpaceId: 'arena' },
      { appId: 'chat', label: 'Chat from server', defaultSpaceId: 'lobby' },
      { appId: 'unknown', label: 'Unknown', defaultSpaceId: 'nowhere' },
      { appId: 'chat', label: 'Duplicate Chat', defaultSpaceId: 'duplicate' }
    ];

    const apps = createClientAppsFromManifests(manifests, ['chat', 'snake']);

    expect(apps?.map((app) => ({
      appId: app.appId,
      label: app.label,
      defaultSpaceId: app.defaultSpaceId
    }))).toEqual([
      { appId: 'snake', label: 'Snake from server', defaultSpaceId: 'arena' },
      { appId: 'chat', label: 'Chat from server', defaultSpaceId: 'lobby' }
    ]);
    expect(apps?.[0]?.View).toBe(snakeClientRegistration.clientApp.View);
    expect(apps?.[1]?.View).toBe(chatClientRegistration.clientApp.View);
  });

  it('returns null when manifest input cannot produce local client apps', () => {
    expect(createClientAppsFromManifests(null)).toBeNull();
    expect(createClientAppsFromManifests([
      { appId: 'unknown', label: 'Unknown', defaultSpaceId: 'nowhere' }
    ])).toBeNull();
  });
});
