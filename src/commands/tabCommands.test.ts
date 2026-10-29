import { Editor } from '@tiptap/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { editorExtensions } from '../editor/extensions';
import { activateTab, requestCloseTab } from './tabCommands';
import { getActiveTab, getTabsState, openTab, patchTab, resetTabsState } from './tabsState';
import { getViewState, resetViewState, setViewState } from './viewState';

let editor: Editor;

beforeEach(() => {
  resetTabsState();
  resetViewState();
  editor = new Editor({ extensions: editorExtensions, content: '<p>hello</p>' });
});

afterEach(() => {
  editor.destroy();
});

describe('activateTab', () => {
  it('switches the active tab', () => {
    const second = openTab({ path: null, name: 'b.md', content: { kind: 'empty' } });

    activateTab(second, null);

    expect(getTabsState().activeId).toBe(second);
  });

  it('leaves source mode on the outgoing tab before switching (applying the textarea content first)', () => {
    const second = openTab({ path: null, name: 'b.md', content: { kind: 'empty' } });
    setViewState({ sourceMode: true, sourceText: '# edited in source mode' });

    activateTab(second, editor);

    expect(getViewState().sourceMode).toBe(false);
    expect(editor.getText()).toContain('edited in source mode');
  });

  it('does nothing extra when not in source mode', () => {
    const second = openTab({ path: null, name: 'b.md', content: { kind: 'empty' } });
    activateTab(second, editor);
    expect(getViewState().sourceMode).toBe(false);
  });
});

describe('requestCloseTab', () => {
  it('closes a clean tab immediately, without opening a confirm dialog', () => {
    const second = openTab({ path: null, name: 'b.md', content: { kind: 'empty' } });

    requestCloseTab(second);

    expect(getTabsState().tabs.map((tab) => tab.id)).not.toContain(second);
    expect(getViewState().closeTabConfirm).toBeNull();
  });

  it('asks for confirmation before closing a dirty tab, and does not close it yet', () => {
    const second = openTab({ path: null, name: 'b.md', content: { kind: 'empty' } });
    patchTab(second, { dirty: true });

    requestCloseTab(second);

    expect(getTabsState().tabs.map((tab) => tab.id)).toContain(second);
    expect(getViewState().closeTabConfirm).toBe(second);
  });

  it('does nothing for a tab id that no longer exists', () => {
    const activeBefore = getActiveTab().id;
    requestCloseTab('does-not-exist');
    expect(getActiveTab().id).toBe(activeBefore);
    expect(getViewState().closeTabConfirm).toBeNull();
  });
});
