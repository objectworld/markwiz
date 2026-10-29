import { beforeEach, describe, expect, it } from 'vitest';
import {
  closeTab,
  findTabByPath,
  getActiveTab,
  getTab,
  getTabsState,
  openTab,
  patchTab,
  resetTabsState,
  setActiveTabId,
  takePendingContent,
} from './tabsState';

beforeEach(() => {
  resetTabsState();
});

describe('tabsState', () => {
  it('starts with exactly one tab, active, blank, and showing the welcome content', () => {
    const { tabs, activeId } = getTabsState();
    expect(tabs).toHaveLength(1);
    expect(activeId).toBe(tabs[0].id);
    expect(tabs[0]).toMatchObject({ path: null, name: 'untitled.md', dirty: false });
    expect(takePendingContent(tabs[0].id)).toMatchObject({ kind: 'html' });
  });

  it('openTab adds a new tab, activates it, and queues its content for one-time use', () => {
    const before = getTabsState().tabs[0].id;
    const id = openTab({ path: '/docs/a.md', name: 'a.md', content: { kind: 'markdown', markdown: '# A' } });

    expect(getTabsState().tabs.map((tab) => tab.id)).toEqual([before, id]);
    expect(getTabsState().activeId).toBe(id);
    expect(takePendingContent(id)).toEqual({ kind: 'markdown', markdown: '# A' });
    // 한 번 꺼내면 비워진다.
    expect(takePendingContent(id)).toEqual({ kind: 'empty' });
  });

  it('findTabByPath ignores case and slash direction on Windows-style paths', () => {
    openTab({ path: 'C:\\docs\\a.md', name: 'a.md', content: { kind: 'empty' } });
    expect(findTabByPath('c:/docs/A.MD')).toBeDefined();
    expect(findTabByPath('C:\\docs\\b.md')).toBeUndefined();
  });

  it('patchTab updates only the targeted tab', () => {
    const first = getActiveTab().id;
    const second = openTab({ path: null, name: 'untitled.md', content: { kind: 'empty' } });

    patchTab(second, { dirty: true });

    expect(getTab(first)?.dirty).toBe(false);
    expect(getTab(second)?.dirty).toBe(true);
  });

  it('setActiveTabId switches the active tab without touching the tab list', () => {
    const first = getActiveTab().id;
    const second = openTab({ path: null, name: 'untitled.md', content: { kind: 'empty' } });

    setActiveTabId(first);

    expect(getTabsState().activeId).toBe(first);
    expect(getTabsState().tabs).toHaveLength(2);
    expect(getTab(second)).toBeDefined();
  });

  it('closeTab picks a sensible neighbor as the new active tab', () => {
    const a = getActiveTab().id;
    const b = openTab({ path: null, name: 'b.md', content: { kind: 'empty' } });
    const c = openTab({ path: null, name: 'c.md', content: { kind: 'empty' } });
    setActiveTabId(b);

    closeTab(b);

    expect(getTabsState().tabs.map((tab) => tab.id)).toEqual([a, c]);
    // 활성 탭이 닫히면 그 자리를 차지한 다음 탭이 활성화된다.
    expect(getTabsState().activeId).toBe(c);
  });

  it('closeTab leaves at least one tab: closing the last one opens a fresh blank tab', () => {
    const only = getActiveTab().id;

    closeTab(only);

    const { tabs, activeId } = getTabsState();
    expect(tabs).toHaveLength(1);
    expect(tabs[0].id).not.toBe(only);
    expect(tabs[0]).toMatchObject({ path: null, name: 'untitled.md', dirty: false });
    expect(activeId).toBe(tabs[0].id);
  });

  it('closeTab on a background tab keeps the current active tab active', () => {
    const a = getActiveTab().id;
    const b = openTab({ path: null, name: 'b.md', content: { kind: 'empty' } });
    setActiveTabId(a);

    closeTab(b);

    expect(getTabsState().activeId).toBe(a);
    expect(getTabsState().tabs.map((tab) => tab.id)).toEqual([a]);
  });
});
