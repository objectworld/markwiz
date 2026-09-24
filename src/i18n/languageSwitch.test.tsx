import { useEffect } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { resetViewState } from '../commands/viewState';
import { editorExtensions } from '../editor/extensions';
import { AboutDialog } from '../menu/AboutDialog';
import { MenuBar } from '../menu/MenuBar';
import { Ribbon } from '../ribbon/Ribbon';
import { StatusBar } from '../ribbon/StatusBar';
import { getLanguage, getSavedLanguage, setLanguage } from './i18n';

function Harness({ onEditor }: { onEditor: (editor: Editor) => void }) {
  const editor = useEditor({ extensions: editorExtensions, content: '<h2>제목</h2><p>본문</p>', immediatelyRender: false });
  useEffect(() => {
    if (editor) onEditor(editor);
  }, [editor, onEditor]);
  return (
    <>
      <MenuBar key={editor ? 'menu-ready' : 'menu-loading'} editor={editor} />
      <Ribbon key={editor ? 'ribbon-ready' : 'ribbon-loading'} editor={editor} />
      <EditorContent editor={editor} />
      <StatusBar key={editor ? 'status-ready' : 'status-loading'} editor={editor} />
    </>
  );
}

async function setup() {
  let editor!: Editor;
  render(<Harness onEditor={(instance) => (editor = instance)} />);
  await waitFor(() => expect(editor).toBeTruthy());
  return editor;
}

afterEach(() => {
  localStorage.clear();
  resetViewState();
});

describe('switching the app language from 도움말 > 언어 / Language', () => {
  it('offers both languages with the current one checked', async () => {
    await setup();
    fireEvent.click(screen.getByRole('menuitem', { name: '도움말' }));
    const korean = await screen.findByRole('menuitemradio', { name: /한국어/ });
    const english = await screen.findByRole('menuitemradio', { name: /English/ });
    expect(korean).toHaveAttribute('aria-checked', 'true');
    expect(english).toHaveAttribute('aria-checked', 'false');
  });

  it('turns the menu bar, ribbon, and status bar into English, and remembers the choice', async () => {
    await setup();
    fireEvent.click(screen.getByRole('menuitem', { name: '도움말' }));
    fireEvent.click(await screen.findByRole('menuitemradio', { name: /English/ }));

    expect(getLanguage()).toBe('en');
    expect(getSavedLanguage()).toBe('en');

    await waitFor(() =>
      expect(screen.getAllByRole('menuitem').map((item) => item.textContent)).toEqual([
        'File',
        'Edit',
        'Font',
        'Paragraph',
        'Insert',
        'Diagram',
        'View',
        'Help',
      ]),
    );
    expect(screen.getByRole('button', { name: 'Bold' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export to Word' })).toBeInTheDocument();
    const style = screen.getByRole('combobox', { name: 'Style' });
    expect(within(style).getByRole('option', { name: 'Heading 3' })).toBeInTheDocument();
    expect(screen.getByRole('toolbar', { name: 'Formatting toolbar' })).toBeInTheDocument();
    expect(screen.getByRole('contentinfo', { name: 'Status bar' })).toHaveTextContent(/words/);
  });

  it('translates the File menu submenus, and can switch back to Korean', async () => {
    await setup();
    act(() => setLanguage('en'));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'File' }));
    expect(await screen.findByRole('menuitem', { name: 'Export' })).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: 'Recent files' })).toBeInTheDocument();
    expect(await screen.findByRole('menuitem', { name: 'Export to PDF' })).toBeInTheDocument();

    fireEvent.click(await screen.findByRole('menuitem', { name: 'Help' }));
    fireEvent.click(await screen.findByRole('menuitemradio', { name: /한국어/ }));
    await waitFor(() => expect(screen.getByRole('menuitem', { name: '파일' })).toBeInTheDocument());
    expect(getSavedLanguage()).toBe('ko');
  });

  it('translates the About dialog live', async () => {
    render(<AboutDialog onClose={() => undefined} />);
    expect(await screen.findByRole('dialog', { name: 'Markwiz 정보' })).toHaveTextContent('버전');
    act(() => setLanguage('en'));
    const dialog = await screen.findByRole('dialog', { name: 'About Markwiz' });
    expect(dialog).toHaveTextContent('Version');
    expect(dialog).toHaveTextContent('A Typora-style WYSIWYG Markdown editor');
  });
});
