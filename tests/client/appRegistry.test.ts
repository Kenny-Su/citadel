import { describe, expect, it } from 'vitest';
import { allClientApps } from '../../src/client/appRegistry';

describe('client app registry', () => {
  it('exposes bundled client app modules in app order', () => {
    expect(allClientApps.map((app) => app.appId)).toEqual(['chat', 'chess', 'snake']);
  });
});
