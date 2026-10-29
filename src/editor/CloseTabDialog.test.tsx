import { Editor } from '@tiptap/core';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { OpenedDocument, PlatformAPI, SavedDocument } from '../platform';
import { editorExtensions } from './extensions';
import { CloseTabDialog } from './CloseTabDialog';
import '../commands/fileCommands';
import { getTab, openTab, patchTab, resetTabsState } from '../commands/tabsState';

vi.mock('../platform', () => ({
  getPlatform: () => Promise.resolve(mockPlatform),
}));

let mockPlatform: PlatformAPI;

beforeEach(() => {
  resetTabsState();
  mockPlatform = {
    localFileKinds: [],
    pickLocalFile: vi.fn<PlatformAPI['pickLocalFile']>(),
    openFile: vi.fn<() => Promise<OpenedDocument | null>>(),
    saveFile: vi.fn<() => Promise<void>>().mockResolvedValue(undefined),
    saveFileAs: vi.fn<() => Promise<SavedDocument | null>>(),
    saveBinaryFileAs: vi.fn<PlatformAPI['saveBinaryFileAs']>(),
  };
});

function setup(id: string, editor: Editor) {
  const onClose = vi.fn();
  render(<CloseTabDialog tabId={id} editors={new Map([[id, editor]])} onClose={onClose} />);
  return onClose;
}

describe('CloseTabDialog', () => {
  it('cancel just closes the dialog, keeping the tab open', () => {
    const id = openTab({ path: '/docs/a.md', name: 'a.md', content: { kind: 'empty' } });
    patchTab(id, { dirty: true });
    const editor = new Editor({ extensions: editorExtensions, content: '<p>hi</p>' });
    const onClose = setup(id, editor);

    fireEvent.click(screen.getByText('취소'));

    expect(getTab(id)).toBeDefined();
    expect(onClose).toHaveBeenCalled();
    expect(mockPlatform.saveFile).not.toHaveBeenCalled();
    editor.destroy();
  });

  it("\"저장 안 함\" closes the tab without saving", () => {
    const id = openTab({ path: '/docs/a.md', name: 'a.md', content: { kind: 'empty' } });
    patchTab(id, { dirty: true });
    const editor = new Editor({ extensions: editorExtensions, content: '<p>hi</p>' });
    const onClose = setup(id, editor);

    fireEvent.click(screen.getByText('저장 안 함'));

    expect(getTab(id)).toBeUndefined();
    expect(onClose).toHaveBeenCalled();
    expect(mockPlatform.saveFile).not.toHaveBeenCalled();
    editor.destroy();
  });

  it('"저장" saves the tab (it already has a path) and then closes it', async () => {
    const id = openTab({ path: '/docs/a.md', name: 'a.md', content: { kind: 'empty' } });
    patchTab(id, { dirty: true });
    const editor = new Editor({ extensions: editorExtensions, content: '<p>hi</p>' });
    const onClose = setup(id, editor);

    fireEvent.click(screen.getByText('저장'));

    await waitFor(() => expect(mockPlatform.saveFile).toHaveBeenCalledWith('/docs/a.md', expect.stringContaining('hi')));
    await waitFor(() => expect(getTab(id)).toBeUndefined());
    expect(onClose).toHaveBeenCalled();
    editor.destroy();
  });

  it('"저장" keeps the tab open if the save-as dialog is cancelled (no path yet)', async () => {
    const id = openTab({ path: null, name: 'untitled.md', content: { kind: 'empty' } });
    patchTab(id, { dirty: true });
    (mockPlatform.saveFileAs as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const editor = new Editor({ extensions: editorExtensions, content: '<p>hi</p>' });
    const onClose = setup(id, editor);

    fireEvent.click(screen.getByText('저장'));

    await waitFor(() => expect(mockPlatform.saveFileAs).toHaveBeenCalled());
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(getTab(id)).toBeDefined();
    editor.destroy();
  });
});
