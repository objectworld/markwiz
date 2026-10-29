import { Editor } from '@tiptap/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { resetRecentFilesCache } from '../commands/recentFiles';
import '../commands/fileCommands';
import { getActiveTab, getTabsState, openTab, patchTab, resetTabsState } from '../commands/tabsState';
import { getViewState, resetViewState } from '../commands/viewState';
import { editorExtensions } from './extensions';
import { TabBar } from './TabBar';

function renderTabBar() {
  const editors = new Map(getTabsState().tabs.map((tab) => [tab.id, new Editor({ extensions: editorExtensions, content: '' })]));
  render(<TabBar editors={editors} />);
  return editors;
}

beforeEach(() => {
  resetTabsState();
  resetViewState();
  resetRecentFilesCache();
});

describe('TabBar', () => {
  it('renders one tab per open document, marking the active one', () => {
    openTab({ path: null, name: 'second.md', content: { kind: 'empty' } });
    renderTabBar();

    const tabs = screen.getAllByRole('tab');
    expect(tabs).toHaveLength(2);
    expect(tabs[0]).toHaveTextContent('untitled.md');
    expect(tabs[1]).toHaveTextContent('second.md');
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true');
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
  });

  it('clicking a tab activates it', () => {
    const first = getActiveTab().id;
    openTab({ path: null, name: 'second.md', content: { kind: 'empty' } });
    renderTabBar();

    fireEvent.click(screen.getByText('untitled.md'));

    expect(getTabsState().activeId).toBe(first);
  });

  it('shows an unsaved indicator for a dirty tab', () => {
    patchTab(getActiveTab().id, { dirty: true });
    renderTabBar();

    expect(screen.getByLabelText('untitled.md (바뀐 내용 있음)')).toBeInTheDocument();
  });

  it('the + button opens a new, empty tab', () => {
    renderTabBar();
    const before = getTabsState().tabs.length;

    fireEvent.click(screen.getByTitle('새 탭'));

    expect(getTabsState().tabs).toHaveLength(before + 1);
  });

  it('closing a clean tab via its × button removes it without asking', () => {
    const second = openTab({ path: null, name: 'second.md', content: { kind: 'empty' } });
    renderTabBar();

    fireEvent.click(screen.getByTitle('second.md 닫기'));

    expect(getTabsState().tabs.map((tab) => tab.id)).not.toContain(second);
    expect(getViewState().closeTabConfirm).toBeNull();
  });

  it('closing a dirty tab via its × button asks for confirmation instead of closing it', () => {
    const second = openTab({ path: null, name: 'second.md', content: { kind: 'empty' } });
    patchTab(second, { dirty: true });
    renderTabBar();

    fireEvent.click(screen.getByTitle('second.md 닫기'));

    expect(getTabsState().tabs.map((tab) => tab.id)).toContain(second);
    expect(getViewState().closeTabConfirm).toBe(second);
  });
});
