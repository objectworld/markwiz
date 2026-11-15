import { Editor } from '@tiptap/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpenedDocument, PlatformAPI, SavedDocument } from '../platform';
import { editorExtensions } from './extensions';
import { ExternalChangeDialog } from './ExternalChangeDialog';
import '../commands/fileCommands';
import { forgetMtimes } from '../commands/externalChange';
import { getTab, openTab, patchTab, resetTabsState } from '../commands/tabsState';

vi.mock('../platform', () => ({
  getPlatform: () => Promise.resolve(mockPlatform),
}));

let mockPlatform: PlatformAPI;

beforeEach(() => {
  resetTabsState();
  forgetMtimes();
  mockPlatform = {
    localFileKinds: [],
    pickLocalFile: vi.fn<PlatformAPI['pickLocalFile']>(),
    openFile: vi.fn<() => Promise<OpenedDocument | null>>(),
    openFileAt: vi.fn<(path: string) => Promise<OpenedDocument>>().mockResolvedValue({ path: '/docs/a.md', name: 'a.md', content: 'new text', mtime: 300 }),
    fileMtime: vi.fn<(path: string) => Promise<number | null>>().mockResolvedValue(300),
    saveFile: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    saveFileAs: vi.fn<() => Promise<SavedDocument | null>>(),
    saveBinaryFileAs: vi.fn<PlatformAPI['saveBinaryFileAs']>(),
  };
});

function setup(dirty: boolean) {
  const id = openTab({ path: '/docs/a.md', name: 'a.md', content: { kind: 'empty' } });
  patchTab(id, { dirty });
  const editor = new Editor({ extensions: editorExtensions, content: '<p>old text</p>' });
  const onClose = vi.fn();
  render(<ExternalChangeDialog tabId={id} editors={new Map([[id, editor]])} onClose={onClose} />);
  return { id, editor, onClose };
}

describe('ExternalChangeDialog', () => {
  it('reloads the file from disk and clears the dirty flag', async () => {
    const { id, editor, onClose } = setup(true);
    expect(screen.getByText(/저장하지 않은 변경 내용이 사라집니다/)).toBeTruthy();

    fireEvent.click(screen.getByText('다시 불러오기'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(editor.getText()).toBe('new text');
    expect(getTab(id)?.dirty).toBe(false);
    editor.destroy();
  });

  it('keeping the current content leaves the document untouched', async () => {
    const { editor, onClose } = setup(false);

    fireEvent.click(screen.getByText('현재 내용 유지'));

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(editor.getText()).toBe('old text');
    expect(mockPlatform.openFileAt).not.toHaveBeenCalled();
    editor.destroy();
  });
});
