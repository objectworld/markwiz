import type { Editor } from '@tiptap/core';
import { parseMarkdown } from '../markdown/parser';
import { serializeToMarkdown } from '../markdown/serializer';
import { registerCommand } from './registry';
import { getViewState, setViewState } from './viewState';

// 현재 문서의 마크다운 원문. 소스 모드 중에는 아직 에디터에 반영되지 않은 textarea 내용이 최신이다.
export function getMarkdown(editor: Editor): string {
  const view = getViewState();
  return view.sourceMode ? view.sourceText : serializeToMarkdown(editor.state.doc);
}

// 소스 모드 중 다른 문서를 불러오거나 새로 만들었을 때 textarea가 옛 내용을 보여주지 않게 맞춘다.
export function syncSourceText(editor: Editor): void {
  if (getViewState().sourceMode) setViewState({ sourceText: serializeToMarkdown(editor.state.doc) });
}

function leaveSourceMode(editor: Editor): boolean {
  const { sourceText } = getViewState();
  // 직렬화 결과가 같으면 문서를 다시 만들지 않아 실행 취소 기록과 커서를 보존한다.
  if (sourceText !== serializeToMarkdown(editor.state.doc)) {
    try {
      editor.commands.setContent(parseMarkdown(editor.schema, sourceText).toJSON());
    } catch (error) {
      console.error('[markwiz] failed to parse source text', error);
      return false;
    }
  }
  setViewState({ sourceMode: false });
  return true;
}

registerCommand('view.toggleSidebar', () => setViewState({ sidebar: !getViewState().sidebar }));
registerCommand('view.outline', () => setViewState({ sidebar: !getViewState().sidebar }));

registerCommand('view.sourceMode', (editor) => {
  if (getViewState().sourceMode) return leaveSourceMode(editor);
  setViewState({ sourceMode: true, sourceText: serializeToMarkdown(editor.state.doc) });
});

registerCommand('view.focusMode', () => setViewState({ focusMode: !getViewState().focusMode }));
registerCommand('view.typewriterMode', () => setViewState({ typewriterMode: !getViewState().typewriterMode }));
