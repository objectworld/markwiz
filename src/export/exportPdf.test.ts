import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import '../commands/viewCommands';
import { getViewState, resetViewState, setViewState } from '../commands/viewState';
import { editorExtensions } from '../editor/extensions';
import { exportPdf } from './exportPdf';

afterEach(() => {
  resetViewState();
  vi.restoreAllMocks();
});

describe('exportPdf', () => {
  it('prints immediately when not in source mode', () => {
    const editor = new Editor({ extensions: editorExtensions, content: '<p>hello</p>' });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    exportPdf(editor);

    expect(print).toHaveBeenCalledOnce();
    editor.destroy();
  });

  it('leaves source mode and prints when the source text parses cleanly', () => {
    const editor = new Editor({ extensions: editorExtensions, content: '<p>hello</p>' });
    setViewState({ sourceMode: true, sourceText: '# Changed' });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    exportPdf(editor);

    expect(getViewState().sourceMode).toBe(false);
    expect(print).toHaveBeenCalledOnce();
    expect(editor.getJSON().content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 1 } });
    editor.destroy();
  });

});
