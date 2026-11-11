import { Editor } from '@tiptap/core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import '../commands/viewCommands';
import { getViewState, resetViewState, setViewState } from '../commands/viewState';
import { editorExtensions } from '../editor/extensions';
import type { PlatformAPI } from '../platform/types';

const saveBinaryFileAs = vi.hoisted(() => vi.fn<PlatformAPI['saveBinaryFileAs']>());
vi.mock('../platform', () => ({ getPlatform: async () => ({ saveBinaryFileAs }) }));

import { exportHtml } from './exportHtml';

let editor: Editor;

beforeEach(() => {
  saveBinaryFileAs.mockReset();
  saveBinaryFileAs.mockResolvedValue({ path: 'C:/out/doc.html', name: 'doc.html' });
  editor = new Editor({
    extensions: editorExtensions,
    content: '<h1>Title</h1><p>Hello <strong>world</strong></p><ul><li><p>one</p></li></ul>',
  });
});

afterEach(() => {
  editor.destroy();
  resetViewState();
  vi.restoreAllMocks();
});

describe('exportHtml', () => {
  it('saves a standalone html document containing the rendered content', async () => {
    await exportHtml(editor);

    expect(saveBinaryFileAs).toHaveBeenCalledOnce();
    const [bytes, name, filter] = saveBinaryFileAs.mock.calls[0];
    expect(name).toBe('untitled.html');
    expect(filter.extensions).toEqual(['html']);
    const html = new TextDecoder().decode(bytes);
    expect(html).toContain('<h1>Title</h1>');
    expect(html).toContain('<strong>world</strong>');
    expect(html).toContain('<li>');
    expect(html).not.toContain('contenteditable');
    expect(html).not.toContain('markwiz-raw-marker"');
    expect(getViewState().notice).toContain('doc.html');
  });

  it('shows no notice when the save dialog is cancelled', async () => {
    saveBinaryFileAs.mockResolvedValue(null);
    await exportHtml(editor);
    expect(getViewState().notice).toBe('');
  });

  it('applies source-mode edits first', async () => {
    setViewState({ sourceMode: true, sourceText: '## Changed' });
    await exportHtml(editor);
    expect(new TextDecoder().decode(saveBinaryFileAs.mock.calls[0][0])).toContain('<h2>Changed</h2>');
  });
});
