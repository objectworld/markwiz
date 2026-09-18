import { Editor } from '@tiptap/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { editorExtensions } from '../editor/extensions';
import type { OpenedDocument, PlatformAPI, SavedDocument } from '../platform';
import { getDocumentState, setDocumentState } from './documentState';
import { executeCommand } from './registry';
import './fileCommands';

vi.mock('../platform', () => ({
  getPlatform: () => Promise.resolve(mockPlatform),
}));

let mockPlatform: PlatformAPI;
let editor: Editor;

beforeEach(() => {
  editor = new Editor({ extensions: editorExtensions, content: '<p>hello</p>' });
  setDocumentState({ path: null, name: 'untitled.md' });
  mockPlatform = {
    openFile: vi.fn<() => Promise<OpenedDocument | null>>(),
    saveFile: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    saveFileAs: vi.fn<() => Promise<SavedDocument | null>>(),
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
