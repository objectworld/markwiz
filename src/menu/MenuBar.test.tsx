import { useEffect } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import '../commands/viewCommands';
import { addRecentFile, clearRecentFiles, getRecentFiles } from '../commands/recentFiles';
import { getViewState, resetViewState, setViewState } from '../commands/viewState';
import { editorExtensions } from '../editor/extensions';
import { APP_LICENSE, APP_VERSION } from '../appInfo';
import { AboutDialog } from './AboutDialog';
import { HelpDialog, prepareReadme } from './HelpDialog';
import { MenuBar } from './MenuBar';

function Harness({ onEditor }: { onEditor: (editor: Editor) => void }) {
  const editor = useEditor({ extensions: editorExtensions, content: '<p>본문</p>', immediatelyRender: false });
  useEffect(() => {
    if (editor) onEditor(editor);
  }, [editor, onEditor]);
  return (
    <>
      <MenuBar key={editor ? 'ready' : 'loading'} editor={editor} />
      <EditorContent editor={editor} />
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
  resetViewState();
  clearRecentFiles();
});

describe('MenuBar', () => {
  it('lists the top-level menus in order, ending with 도움말', async () => {
    await setup();
    const titles = screen.getAllByRole('menuitem').map((item) => item.textContent);
    expect(titles).toEqual(['파일', '편집', '글꼴', '단락', '삽입', '다이어그램', '보기', '도움말']);
  });

  it('runs a 보기 item and closes the menu', async () => {
    await setup();
    expect(getViewState().focusMode).toBe(false);

    fireEvent.click(screen.getByRole('menuitem', { name: '보기' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: /포커스 모드/ }));

    expect(getViewState().focusMode).toBe(true);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('shows the shortcut next to an item', async () => {
    await setup();
    fireEvent.click(screen.getByRole('menuitem', { name: '보기' }));
    const item = await screen.findByRole('menuitem', { name: /포커스 모드/ });
    expect(item).toHaveTextContent('F8');
  });

  it('switches menus on hover while one is open and closes on Escape', async () => {
    await setup();
    fireEvent.click(screen.getByRole('menuitem', { name: '파일' }));
    fireEvent.mouseEnter(screen.getByRole('menuitem', { name: '삽입' }));
    expect(await screen.findByRole('menuitem', { name: '구분선' })).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
  });

  it('opens the help dialog from 도움말 > README 보기', async () => {
    await setup();
    fireEvent.click(screen.getByRole('menuitem', { name: '도움말' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'README 보기' }));
    expect(getViewState().help).toBe(true);
  });
});

describe('최근에 연 파일 submenu', () => {
  it('lists the recent files, shows the folder, and updates when a file is added', async () => {
    await setup();
    fireEvent.click(screen.getByRole('menuitem', { name: '파일' }));
    expect(await screen.findByRole('menuitem', { name: '(최근 파일 없음)' })).toBeDisabled();

    act(() => addRecentFile({ path: 'C:\\docs\\notes\\a.md', name: 'a.md' }));
    const item = await screen.findByRole('menuitem', { name: /a\.md/ });
    expect(item).toHaveTextContent('C:/docs/notes');
    expect(item).toHaveAttribute('title', 'C:\\docs\\notes\\a.md');
  });

  it('clears the list from the submenu', async () => {
    await setup();
    act(() => addRecentFile({ path: 'C:\\docs\\a.md', name: 'a.md' }));
    fireEvent.click(screen.getByRole('menuitem', { name: '파일' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: '목록 지우기' }));
    expect(getRecentFiles()).toEqual([]);
  });
});

describe('AboutDialog', () => {
  it('shows the version and intro from 도움말 > Markwiz 정보 and closes with Escape', async () => {
    await setup();
    fireEvent.click(screen.getByRole('menuitem', { name: '도움말' }));
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Markwiz 정보' }));
    expect(getViewState().about).toBe(true);

    let closed = 0;
    render(<AboutDialog onClose={() => (closed += 1)} />);
    const dialog = await screen.findByRole('dialog', { name: 'Markwiz 정보' });
    expect(dialog).toHaveTextContent(`버전 ${APP_VERSION}`);
    expect(dialog).toHaveTextContent('WYSIWYG 마크다운 에디터');
    expect(dialog).toHaveTextContent(APP_LICENSE);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(closed).toBeGreaterThan(0);
  });
});

describe('HelpDialog', () => {
  it('renders README.md read-only and closes with Escape', async () => {
    const editor = await setup();
    let closed = 0;
    setViewState({ help: true });
    render(<HelpDialog editor={editor} onClose={() => (closed += 1)} />);

    const dialog = await screen.findByRole('dialog', { name: '도움말' });
    await waitFor(() => expect(dialog.querySelector('h1')?.textContent).toBe('Markwiz'));
    expect(dialog.querySelector('.ProseMirror')?.getAttribute('contenteditable')).toBe('false');

    act(() => void fireEvent.keyDown(window, { key: 'Escape' }));
    expect(closed).toBeGreaterThan(0);
  });

  it('drops the raw HTML banner and keeps the rest of the README', () => {
    const prepared = prepareReadme('<p align="center">\n  <img src="docs/images/banner.png">\n</p>\n\n# Markwiz\n');
    expect(prepared).not.toContain('<p');
    expect(prepared).toContain('# Markwiz');
  });
});
