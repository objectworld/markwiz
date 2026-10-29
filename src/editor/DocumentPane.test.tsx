import type { Editor } from '@tiptap/core';
import { act, render, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setLanguage } from '../i18n/i18n';
import { getTab, openTab, patchTab, resetTabsState, type DocumentTab } from '../commands/tabsState';
import { DocumentPane } from './DocumentPane';

beforeEach(() => {
  resetTabsState();
});

function renderPane(tab: DocumentTab) {
  let editor: Editor | null = null;
  const { unmount } = render(
    <DocumentPane tab={tab} isActive onEditorReady={(_id, instance) => (editor = instance)} />,
  );
  return { unmount, getEditor: () => editor };
}

afterEach(() => {
  setLanguage('ko', { persist: false });
});

describe('DocumentPane', () => {
  it('marks the tab dirty when the user actually edits it', async () => {
    const id = openTab({ path: null, name: 'untitled.md', content: { kind: 'empty' } });
    const tab: DocumentTab = { id, path: null, name: 'untitled.md', dirty: false };
    const { getEditor } = renderPane(tab);
    await waitFor(() => expect(getEditor()).toBeTruthy());
    expect(getTab(id)?.dirty).toBe(false);

    getEditor()!.commands.insertContent('hi');

    await waitFor(() => expect(getTab(id)?.dirty).toBe(true));
  });

  it('does not mark a freshly opened markdown document dirty', async () => {
    const id = openTab({ path: '/docs/a.md', name: 'a.md', content: { kind: 'markdown', markdown: '# Hello' } });
    const tab: DocumentTab = { id, path: '/docs/a.md', name: 'a.md', dirty: false };
    const { getEditor } = renderPane(tab);

    await waitFor(() => expect(getEditor()?.getText()).toContain('Hello'));

    expect(getTab(id)?.dirty).toBe(false);
  });

  it('swaps the welcome content to the new language while the boot tab is still untouched', async () => {
    const id = openTab({ path: null, name: 'untitled.md', content: { kind: 'html', html: '<h1>Markwiz</h1><p>굵게</p>' } });
    const tab: DocumentTab = { id, path: null, name: 'untitled.md', dirty: false };
    const { getEditor } = renderPane(tab);
    await waitFor(() => expect(getEditor()?.getText()).toContain('굵게'));

    act(() => setLanguage('en', { persist: false }));

    await waitFor(() => expect(getEditor()!.getText()).toContain('bold'));
  });

  it('leaves an edited welcome document alone when the language changes', async () => {
    const id = openTab({ path: null, name: 'untitled.md', content: { kind: 'html', html: '<h1>Markwiz</h1><p>굵게</p>' } });
    patchTab(id, { dirty: true });
    const tab: DocumentTab = { id, path: null, name: 'untitled.md', dirty: true };
    const { getEditor } = renderPane(tab);
    await waitFor(() => expect(getEditor()?.getText()).toContain('굵게'));

    act(() => setLanguage('en', { persist: false }));

    expect(getEditor()!.getText()).toContain('굵게');
  });
});
