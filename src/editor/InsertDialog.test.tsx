import { useEffect } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { executeCommand } from '../commands/registry';
import '../commands/defaultCommands';
import { getViewState, resetViewState } from '../commands/viewState';
import { parseMarkdown } from '../markdown/parser';
import { serializeToMarkdown } from '../markdown/serializer';
import type { PlatformAPI } from '../platform';
import { editorExtensions } from './extensions';
import { applyImage, applyLink, InsertDialog } from './InsertDialog';

let mockPlatform: PlatformAPI;

vi.mock('../platform', () => ({
  getPlatform: () => Promise.resolve(mockPlatform),
}));

beforeEach(() => {
  mockPlatform = {
    localFileKinds: ['image', 'any'],
    pickLocalFile: vi.fn<PlatformAPI['pickLocalFile']>(),
    openFile: vi.fn(),
    saveFile: vi.fn(),
    saveFileAs: vi.fn(),
  };
});

afterEach(() => resetViewState());

function Harness({ content, onEditor }: { content: string; onEditor: (editor: Editor) => void }) {
  const editor = useEditor({ extensions: editorExtensions, content, immediatelyRender: false });
  useEffect(() => {
    if (editor) onEditor(editor);
  }, [editor, onEditor]);
  return <EditorContent editor={editor} />;
}

async function setup(content = '<p>hello world</p>') {
  let editor!: Editor;
  render(<Harness content={content} onEditor={(instance) => (editor = instance)} />);
  await waitFor(() => expect(editor).toBeTruthy());
  return editor;
}

const values = { url: '', text: '', alt: '' };

describe('applyLink', () => {
  it('links the selected text', async () => {
    const editor = await setup();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    applyLink(editor, { kind: 'link', url: '', hasSelection: true }, { ...values, url: 'example.com' });
    expect(serializeToMarkdown(editor.state.doc)).toBe('[hello](https://example.com) world');
  });

  it('inserts the display text when nothing is selected, falling back to the address', async () => {
    const editor = await setup('<p></p>');
    applyLink(editor, { kind: 'link', url: '', hasSelection: false }, { ...values, url: 'https://a.b', text: '여기' });
    expect(serializeToMarkdown(editor.state.doc)).toBe('[여기](https://a.b)');

    editor.commands.clearContent();
    applyLink(editor, { kind: 'link', url: '', hasSelection: false }, { ...values, url: 'https://a.b' });
    expect(serializeToMarkdown(editor.state.doc)).toBe('[https://a.b](https://a.b)');
  });

  it('accepts a local file as the link target', async () => {
    const editor = await setup();
    editor.commands.setTextSelection({ from: 1, to: 6 });
    applyLink(editor, { kind: 'link', url: '', hasSelection: true }, { ...values, url: 'C:\\Users\\me\\My Docs\\a.pdf' });
    expect(serializeToMarkdown(editor.state.doc)).toBe('[hello](file:///C:/Users/me/My%20Docs/a.pdf) world');
  });

  it('removes the link when the address is empty', async () => {
    const editor = await setup('<p><a href="https://a.b">hello</a> world</p>');
    editor.commands.setTextSelection(3);
    applyLink(editor, { kind: 'link', url: 'https://a.b', hasSelection: true }, values);
    expect(serializeToMarkdown(editor.state.doc)).toBe('hello world');
  });
});

describe('applyImage', () => {
  it('inserts an image with alt text and rejects an empty address', async () => {
    const editor = await setup('<p></p>');
    expect(applyImage(editor, values)).toBe(false);
    applyImage(editor, { ...values, url: 'https://a.b/c.png', alt: '고양이' });
    expect(serializeToMarkdown(editor.state.doc)).toBe('![고양이](https://a.b/c.png)');
  });
});

describe('file: addresses survive a save and reopen', () => {
  it('round-trips a local file link and image through markdown', async () => {
    const editor = await setup();
    const markdown = '[문서](file:///C:/Users/me/a%20b.pdf) ![그림](file:///C:/Users/me/img.png)';
    const doc = parseMarkdown(editor.schema, markdown);
    const hrefs: string[] = [];
    const srcs: string[] = [];
    doc.descendants((node) => {
      node.marks.forEach((mark) => mark.type.name === 'link' && hrefs.push(mark.attrs.href));
      if (node.type.name === 'image') srcs.push(node.attrs.src);
    });
    expect(hrefs).toEqual(['file:///C:/Users/me/a%20b.pdf']);
    expect(srcs).toEqual(['file:///C:/Users/me/img.png']);
    expect(serializeToMarkdown(doc)).toBe(markdown);
  });

  it('still refuses javascript: links', async () => {
    const editor = await setup();
    const doc = parseMarkdown(editor.schema, '[x](javascript:alert(1))');
    expect(doc.textContent).toContain('javascript:alert(1)');
  });
});

describe('InsertDialog', () => {
  it('is opened by the format.image command and inserts the typed address', async () => {
    const editor = await setup('<p></p>');
    executeCommand('format.image', editor);
    const request = getViewState().insert!;
    expect(request.kind).toBe('image');

    render(<InsertDialog editor={editor} request={request} onClose={() => undefined} />);
    fireEvent.change(screen.getByLabelText('이미지 주소 또는 파일'), { target: { value: 'https://a.b/c.png' } });
    fireEvent.click(screen.getByRole('button', { name: '삽입' }));
    expect(serializeToMarkdown(editor.state.doc)).toBe('![](https://a.b/c.png)');
  });

  it('shows an error and stays open when the image address is empty', async () => {
    const editor = await setup('<p></p>');
    let closed = false;
    render(
      <InsertDialog editor={editor} request={{ kind: 'image', url: '', hasSelection: false }} onClose={() => (closed = true)} />,
    );
    fireEvent.click(screen.getByRole('button', { name: '삽입' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('이미지 주소');
    expect(closed).toBe(false);
  });

  it('fills the address from the file picker and defaults the alt text to the file name', async () => {
    const editor = await setup('<p></p>');
    vi.mocked(mockPlatform.pickLocalFile).mockResolvedValue({ url: 'file:///C:/pics/cat.png', name: 'cat.png' });
    render(<InsertDialog editor={editor} request={{ kind: 'image', url: '', hasSelection: false }} onClose={() => undefined} />);

    fireEvent.click(await screen.findByRole('button', { name: /파일 선택/ }));
    await waitFor(() => expect(screen.getByLabelText('이미지 주소 또는 파일')).toHaveValue('file:///C:/pics/cat.png'));
    expect(screen.getByLabelText('대체 텍스트')).toHaveValue('cat');
    expect(mockPlatform.pickLocalFile).toHaveBeenCalledWith('image');

    fireEvent.click(screen.getByRole('button', { name: '삽입' }));
    expect(serializeToMarkdown(editor.state.doc)).toBe('![cat](file:///C:/pics/cat.png)');
  });

  it('hides the file button when the platform cannot pick that kind of file', async () => {
    mockPlatform = { ...mockPlatform, localFileKinds: ['image'] };
    const editor = await setup('<p></p>');
    render(<InsertDialog editor={editor} request={{ kind: 'link', url: '', hasSelection: false }} onClose={() => undefined} />);
    await screen.findByRole('dialog', { name: '링크 삽입' });
    await waitFor(() => expect(screen.queryByRole('button', { name: /파일 선택/ })).toBeNull());
  });

  it('shows the picker error message', async () => {
    const editor = await setup('<p></p>');
    vi.mocked(mockPlatform.pickLocalFile).mockRejectedValue(new Error('1MB 이하만 가능'));
    render(<InsertDialog editor={editor} request={{ kind: 'image', url: '', hasSelection: false }} onClose={() => undefined} />);
    fireEvent.click(await screen.findByRole('button', { name: /파일 선택/ }));
    expect(await screen.findByRole('alert')).toHaveTextContent('1MB 이하만 가능');
  });

  it('closes on Escape', async () => {
    const editor = await setup('<p></p>');
    let closed = false;
    render(<InsertDialog editor={editor} request={{ kind: 'link', url: '', hasSelection: false }} onClose={() => (closed = true)} />);
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(closed).toBe(true);
  });
});
