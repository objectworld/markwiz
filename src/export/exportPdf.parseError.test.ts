import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';

// 소스 모드에서 벗어날 때(leaveSourceMode) 마크다운 파싱이 실패하는 경로를 재현한다.
// vi.mock은 파일 단위로만 적용되므로, 정상 동작을 확인하는 exportPdf.test.ts와 분리했다.
vi.mock('../markdown/parser', () => ({
  parseMarkdown: vi.fn(() => {
    throw new Error('boom');
  }),
}));

import '../commands/viewCommands';
import { getViewState, resetViewState, setViewState } from '../commands/viewState';
import { editorExtensions } from '../editor/extensions';
import { exportPdf } from './exportPdf';

afterEach(() => {
  resetViewState();
  vi.restoreAllMocks();
});

describe('exportPdf with a broken source-mode parse', () => {
  it('shows a notice, stays in source mode, and does not print', () => {
    const editor = new Editor({ extensions: editorExtensions, content: '<p>hello</p>' });
    setViewState({ sourceMode: true, sourceText: '# Changed' });
    const print = vi.spyOn(window, 'print').mockImplementation(() => undefined);
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined);

    exportPdf(editor);

    expect(getViewState().sourceMode).toBe(true);
    expect(getViewState().notice).toContain('내보낼 수 없습니다');
    expect(print).not.toHaveBeenCalled();
    errors.mockRestore();
    editor.destroy();
  });
});
