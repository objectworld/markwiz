import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { waitFor } from '@testing-library/react';
import '../commands/viewCommands';
import { getViewState, resetViewState, setViewState } from '../commands/viewState';
import { editorExtensions } from '../editor/extensions';
import { exportPdf, pdfTitleFor, printDocument } from './exportPdf';

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

  it('leaves source mode and prints when the source text parses cleanly', async () => {
    const editor = new Editor({ extensions: editorExtensions, content: '<p>hello</p>' });
    setViewState({ sourceMode: true, sourceText: '# Changed' });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    exportPdf(editor);

    expect(getViewState().sourceMode).toBe(false);
    // 소스 모드에서 돌아온 직후에는 NodeView가 그려질 때까지 잠깐 기다린 뒤 인쇄한다.
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
    expect(editor.getJSON().content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 1 } });
    editor.destroy();
  });

});

describe('printDocument', () => {
  it('prints immediately when not in source mode', () => {
    const editor = new Editor({ extensions: editorExtensions, content: '<p>hello</p>' });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    printDocument(editor);

    expect(print).toHaveBeenCalledOnce();
    editor.destroy();
  });

  it('applies source-mode edits before printing', async () => {
    const editor = new Editor({ extensions: editorExtensions, content: '<p>hello</p>' });
    setViewState({ sourceMode: true, sourceText: '# Changed' });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);

    printDocument(editor);

    expect(getViewState().sourceMode).toBe(false);
    await waitFor(() => expect(print).toHaveBeenCalledOnce());
    editor.destroy();
  });
});

describe('PDF file name', () => {
  it('uses the markdown file name without its extension as the document title while printing', async () => {
    const { setDocumentState } = await import('../commands/documentState');
    setDocumentState({ path: 'C:/docs/am-oss,nms-service-pattern-tmf.md', name: 'am-oss,nms-service-pattern-tmf.md' });
    document.title = 'am-oss,nms-service-pattern-tmf.md - Markwiz';
    const editor = new Editor({ extensions: editorExtensions, content: '<p>hello</p>' });
    let titleDuringPrint = '';
    vi.spyOn(window, 'print').mockImplementation(() => {
      titleDuringPrint = document.title;
    });

    exportPdf(editor);

    expect(titleDuringPrint).toBe('am-oss,nms-service-pattern-tmf');
    // 인쇄가 끝나면 원래 제목으로 돌아온다.
    window.dispatchEvent(new Event('afterprint'));
    expect(document.title).toBe('am-oss,nms-service-pattern-tmf.md - Markwiz');
    editor.destroy();
  });

  it('strips .md/.markdown and falls back to untitled', () => {
    expect(pdfTitleFor('notes.MD')).toBe('notes');
    expect(pdfTitleFor('a.b.markdown')).toBe('a.b');
    expect(pdfTitleFor('.md')).toBe('untitled');
  });
});
