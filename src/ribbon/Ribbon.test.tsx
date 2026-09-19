import { useEffect } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setDocumentState } from '../commands/documentState';
import { editorExtensions } from '../editor/extensions';
import { Ribbon } from './Ribbon';
import { countWords, StatusBar } from './StatusBar';

function Harness({ content, onEditor }: { content: string; onEditor: (editor: Editor) => void }) {
  const editor = useEditor({ extensions: editorExtensions, content, immediatelyRender: false });
  useEffect(() => {
    if (editor) onEditor(editor);
  }, [editor, onEditor]);
  return (
    <>
      <Ribbon key={editor ? 'ready' : 'loading'} editor={editor} />
      <EditorContent editor={editor} />
      <StatusBar key={editor ? 'ready-status' : 'loading-status'} editor={editor} />
    </>
  );
}

async function setup(content: string) {
  let editor!: Editor;
  render(<Harness content={content} onEditor={(instance) => (editor = instance)} />);
  await waitFor(() => expect(editor).toBeTruthy());
  return editor;
}

describe('countWords', () => {
  it('counts whitespace-separated words, including Korean', () => {
    expect(countWords('')).toBe(0);
    expect(countWords('  ')).toBe(0);
    expect(countWords('hello world')).toBe(2);
    expect(countWords('안녕하세요  마크다운\n에디터')).toBe(3);
  });
});

describe('Ribbon', () => {
  it('is a single toolbar without Home/Insert tabs', async () => {
    await setup('<p>x</p>');
    expect(screen.queryByRole('tab')).toBeNull();
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('toggles bold on the selection through the command registry and reflects it as pressed', async () => {
    const editor = await setup('<p>hello world</p>');
    act(() => void editor.commands.setTextSelection({ from: 1, to: 6 }));

    const bold = screen.getByRole('button', { name: '굵게' });
    expect(bold).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(bold);

    expect(editor.getHTML()).toContain('<strong>hello</strong>');
    await waitFor(() => expect(bold).toHaveAttribute('aria-pressed', 'true'));
  });

  it('shows the shortcut from keymap.json in the tooltip', async () => {
    await setup('<p>x</p>');
    expect(screen.getByRole('button', { name: '굵게' }).getAttribute('title')).toMatch(/^굵게 \((Ctrl|Cmd)\+B\)$/);
  });

  it('changes the paragraph style from the style dropdown and follows the cursor', async () => {
    const editor = await setup('<p>title</p>');
    const select = screen.getByRole('combobox', { name: '스타일' }) as HTMLSelectElement;
    expect(select.value).toBe('p');

    fireEvent.change(select, { target: { value: '2' } });
    expect(editor.getHTML()).toContain('<h2>title</h2>');
    await waitFor(() => expect(select.value).toBe('2'));
  });

  it('disables undo/redo until there is history, then enables undo', async () => {
    const editor = await setup('<p>x</p>');
    expect(screen.getByRole('button', { name: '실행 취소' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '다시 실행' })).toBeDisabled();

    act(() => void editor.chain().insertContent('y').run());
    await waitFor(() => expect(screen.getByRole('button', { name: '실행 취소' })).toBeEnabled());
  });

  it('offers insert actions in the same toolbar and inserts a horizontal rule and a diagram template', async () => {
    const editor = await setup('<p>text</p>');
    fireEvent.click(screen.getByRole('button', { name: '구분선' }));
    expect(editor.getHTML()).toContain('<hr>');

    fireEvent.click(screen.getByRole('button', { name: 'PlantUML' }));
    expect(editor.getHTML()).toContain('language-plantuml');
    expect(editor.getText()).toContain('Alice -> Bob');
  });

  it('does not steal focus from the editor when a button is pressed', async () => {
    await setup('<p>x</p>');
    const button = screen.getByRole('button', { name: '굵게' });
    const notPrevented = fireEvent.mouseDown(button);
    expect(notPrevented).toBe(false);
  });
});

describe('StatusBar', () => {
  it('shows word/character counts, the current block type and the document name', async () => {
    act(() => setDocumentState({ path: null, name: 'notes.md' }));
    const editor = await setup('<h2>Hello world</h2><p>one two three</p>');

    act(() => void editor.commands.setTextSelection(3));
    const footer = screen.getByRole('contentinfo');
    await waitFor(() => expect(footer).toHaveTextContent('단어 5개'));
    expect(footer).toHaveTextContent('글자 21자');
    expect(footer).toHaveTextContent('제목 2');
    expect(footer).toHaveTextContent('notes.md');

    act(() => void editor.commands.setTextSelection({ from: 3, to: 8 }));
    await waitFor(() => expect(footer).toHaveTextContent('선택 5자'));

    act(() => setDocumentState({ path: null, name: 'untitled.md' }));
  });
});
