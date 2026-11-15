import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PlatformAPI } from '../platform';
import { checkExternalChanges, forgetMtimes, rememberMtime } from './externalChange';
import { openTab, resetTabsState } from './tabsState';
import { getViewState, resetViewState } from './viewState';

let mtime: number | null;
vi.mock('../platform', () => ({
  getPlatform: () => Promise.resolve({ fileMtime: () => Promise.resolve(mtime) } as unknown as PlatformAPI),
}));

beforeEach(() => {
  resetViewState();
  resetTabsState();
  forgetMtimes();
  mtime = 100;
});
afterEach(() => vi.restoreAllMocks());

describe('checkExternalChanges', () => {
  it('asks about a tab whose file changed on disk', async () => {
    const id = openTab({ path: 'C:/a.md', name: 'a.md', content: { kind: 'empty' } });
    rememberMtime('C:/a.md', 100);
    mtime = 200;
    await checkExternalChanges();
    expect(getViewState().externalChange).toBe(id);
  });

  it('stays quiet when the file is unchanged, deleted, or was never recorded', async () => {
    openTab({ path: 'C:/a.md', name: 'a.md', content: { kind: 'empty' } });
    await checkExternalChanges();
    expect(getViewState().externalChange).toBeNull();
    rememberMtime('C:/a.md', 100);
    await checkExternalChanges();
    expect(getViewState().externalChange).toBeNull();
    mtime = null;
    await checkExternalChanges();
    expect(getViewState().externalChange).toBeNull();
  });
});
