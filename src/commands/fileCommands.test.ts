import { Editor } from '@tiptap/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { editorExtensions } from '../editor/extensions';
import type { OpenedDocument, PlatformAPI, SavedDocument } from '../platform';
import { getDocumentState, setDocumentState } from './documentState';
import { getRecentFiles, resetRecentFilesCache } from './recentFiles';
import { getViewState, resetViewState } from './viewState';
import { executeCommand } from './registry';
import { openRecentFile } from './fileCommands';
import './fileCommands';

vi.mock('../platform', () => ({
  getPlatform: () => Promise.resolve(mockPlatform),
}));

let mockPlatform: PlatformAPI;
let editor: Editor;

beforeEach(() => {
  localStorage.clear();
  resetRecentFilesCache();
  resetViewState();
  editor = new Editor({ extensions: editorExtensions, content: '<p>hello</p>' });
  setDocumentState({ path: null, name: 'untitled.md' });
  mockPlatform = {
    localFileKinds: [],
    pickLocalFile: vi.fn<PlatformAPI['pickLocalFile']>(),
    openFile: vi.fn<() => Promise<OpenedDocument | null>>(),
    saveFile: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    saveFileAs: vi.fn<() => Promise<SavedDocument | null>>(),
    saveBinaryFileAs: vi.fn<PlatformAPI['saveBinaryFileAs']>(),
  };
});

afterEach(() => {
  editor.destroy();
});

async function flushMicrotasks() {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

describe('file commands', () => {
  it('file.new clears the editor and resets document state', () => {
    executeCommand('file.new', editor);
    expect(editor.getText()).toBe('');
    expect(getDocumentState()).toEqual({ path: null, name: 'untitled.md' });
  });

  it('file.open loads markdown content and records the opened path', async () => {
    (mockPlatform.openFile as ReturnType<typeof vi.fn>).mockResolvedValue({
      path: '/docs/note.md',
      name: 'note.md',
      content: '# Loaded\n\nBody text.',
    });

    executeCommand('file.open', editor);
    await flushMicrotasks();

    expect(editor.getHTML()).toContain('Loaded');
    expect(getDocumentState()).toEqual({ path: '/docs/note.md', name: 'note.md' });
  });

  it('file.open records the document location before the content is rendered, so relative images resolve against the new file', async () => {
    (mockPlatform.openFile as ReturnType<typeof vi.fn>).mockResolvedValue({
      path: 'C:\\docs\\note.md',
      name: 'note.md',
      content: '![](./img/a.png)',
    });
    let pathWhileRendering: string | null | undefined;
    editor.on('update', () => {
      pathWhileRendering = getDocumentState().path;
    });

    executeCommand('file.open', editor);
    await flushMicrotasks();

    expect(pathWhileRendering).toBe('C:\\docs\\note.md');
  });

  it('file.save falls back to save-as when there is no current path', async () => {
    (mockPlatform.saveFileAs as ReturnType<typeof vi.fn>).mockResolvedValue({
      path: '/docs/untitled.md',
      name: 'untitled.md',
    });

    executeCommand('file.save', editor);
    await flushMicrotasks();

    expect(mockPlatform.saveFileAs).toHaveBeenCalledWith(expect.stringContaining('hello'), 'untitled.md');
    expect(getDocumentState()).toEqual({ path: '/docs/untitled.md', name: 'untitled.md' });
  });

  it('file.save overwrites the current path when one is already set', async () => {
    setDocumentState({ path: '/docs/note.md', name: 'note.md' });

    executeCommand('file.save', editor);
    await flushMicrotasks();

    expect(mockPlatform.saveFile).toHaveBeenCalledWith('/docs/note.md', expect.stringContaining('hello'));
    expect(mockPlatform.saveFileAs).not.toHaveBeenCalled();
  });

  it('file.saveAs always prompts, even with a current path', async () => {
    setDocumentState({ path: '/docs/note.md', name: 'note.md' });
    (mockPlatform.saveFileAs as ReturnType<typeof vi.fn>).mockResolvedValue({
      path: '/docs/copy.md',
      name: 'copy.md',
    });

    executeCommand('file.saveAs', editor);
    await flushMicrotasks();

    expect(mockPlatform.saveFileAs).toHaveBeenCalledWith(expect.stringContaining('hello'), 'note.md');
    expect(getDocumentState()).toEqual({ path: '/docs/copy.md', name: 'copy.md' });
  });
});

describe('recent files', () => {
  const opened = (path: string) => ({ path, name: path.split(/[\\/]/).pop()!, content: `# ${path}` });

  function supportOpenFileAt(files: Record<string, string> = {}) {
    mockPlatform.openFileAt = vi.fn(async (path: string) => {
      if (!(path in files)) throw new Error('not found');
      return { path, name: path.split(/[\\/]/).pop()!, content: files[path] };
    });
  }

  it('records a file opened with file.open (most recent first) on the desktop', async () => {
    supportOpenFileAt();
    const openFile = mockPlatform.openFile as ReturnType<typeof vi.fn>;
    openFile.mockResolvedValueOnce(opened('C:\\docs\\a.md')).mockResolvedValueOnce(opened('C:\\docs\\b.md'));

    executeCommand('file.open', editor);
    await flushMicrotasks();
    executeCommand('file.open', editor);
    await flushMicrotasks();

    expect(getRecentFiles().map((f) => f.name)).toEqual(['b.md', 'a.md']);
    expect(getRecentFiles()[0].path).toBe('C:\\docs\\b.md');
  });

  it('does not record anything when the platform cannot reopen files by path (web)', async () => {
    (mockPlatform.openFile as ReturnType<typeof vi.fn>).mockResolvedValue({ path: null, name: 'a.md', content: 'x' });
    executeCommand('file.open', editor);
    await flushMicrotasks();
    expect(getRecentFiles()).toEqual([]);
  });

  it('records files saved with Save As, but not plain saves of an already recorded file', async () => {
    supportOpenFileAt();
    (mockPlatform.saveFileAs as ReturnType<typeof vi.fn>).mockResolvedValue({ path: 'C:\\docs\\new.md', name: 'new.md' });
    executeCommand('file.saveAs', editor);
    await flushMicrotasks();
    expect(getRecentFiles().map((f) => f.name)).toEqual(['new.md']);

    executeCommand('file.save', editor);
    await flushMicrotasks();
    expect(getRecentFiles()).toHaveLength(1);
  });

  it('opens a recent file by path, loads its content, and moves it to the front', async () => {
    supportOpenFileAt({ 'C:\\docs\\a.md': '# Alpha', 'C:\\docs\\b.md': '# Beta' });
    expect(await openRecentFile(editor, 'C:\\docs\\a.md')).toBe(true);
    expect(await openRecentFile(editor, 'C:\\docs\\b.md')).toBe(true);
    expect(await openRecentFile(editor, 'C:\\docs\\a.md')).toBe(true);

    expect(editor.getHTML()).toContain('Alpha');
    expect(getDocumentState()).toEqual({ path: 'C:\\docs\\a.md', name: 'a.md' });
    expect(getRecentFiles().map((f) => f.name)).toEqual(['a.md', 'b.md']);
  });

  it('removes a file that can no longer be opened and tells the user in the status bar', async () => {
    supportOpenFileAt({});
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    (mockPlatform.saveFileAs as ReturnType<typeof vi.fn>).mockResolvedValue({ path: 'C:\\docs\\gone.md', name: 'gone.md' });
    executeCommand('file.saveAs', editor);
    await flushMicrotasks();
    setDocumentState({ path: 'C:\\docs\\keep.md', name: 'keep.md' });
    const before = editor.getHTML();

    expect(await openRecentFile(editor, 'C:\\docs\\gone.md')).toBe(false);

    expect(getRecentFiles()).toEqual([]);
    expect(getViewState().notice).toContain('gone.md');
    expect(editor.getHTML()).toBe(before);
    expect(getDocumentState().name).toBe('keep.md');
    errors.mockRestore();
  });
});
