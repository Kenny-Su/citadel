import { describe, expect, it } from 'vitest';
import {
  bundledAppDefinitions,
  bundledAppIds,
  bundledAppManifests,
  getBundledAppDefinition,
  getBundledAppManifest,
  orderBundledAppEntries
} from '../../src/bundledApps/catalog.js';

describe('bundled app catalog', () => {
  it('owns the canonical bundled app order', () => {
    expect(bundledAppIds).toEqual(['chat', 'chess', 'snake']);
  });

  it('exposes manifests in bundled app order', () => {
    expect(bundledAppDefinitions.map((definition) => definition.appId)).toEqual(bundledAppIds);
    expect(bundledAppDefinitions.map((definition) => definition.manifest)).toEqual(bundledAppManifests);
    expect(bundledAppManifests.map((manifest) => manifest.appId)).toEqual(bundledAppIds);
    expect(bundledAppManifests).toEqual([
      {
        appId: 'chat',
        label: 'Chat',
        defaultSpaceId: 'general',
        persistence: 'sqlite',
        version: '0.1.0'
      },
      {
        appId: 'chess',
        label: 'Chess',
        defaultSpaceId: 'general',
        persistence: 'sqlite',
        version: '0.1.0'
      },
      {
        appId: 'snake',
        label: 'Snake',
        defaultSpaceId: 'general',
        persistence: 'none',
        version: '0.1.0'
      }
    ]);
  });

  it('looks up bundled manifests by app id', () => {
    expect(getBundledAppDefinition('chess')?.manifest.label).toBe('Chess');
    expect(getBundledAppManifest('chess')?.label).toBe('Chess');
  });

  it('orders bundled entries by catalog order', () => {
    const ordered = orderBundledAppEntries({
      snake: { appId: 'snake', value: 3 },
      chat: { appId: 'chat', value: 1 },
      chess: { appId: 'chess', value: 2 }
    });

    expect(ordered.map((entry) => entry.appId)).toEqual(['chat', 'chess', 'snake']);
    expect(ordered.map((entry) => entry.value)).toEqual([1, 2, 3]);
  });
});
