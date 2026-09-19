import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { useDocumentState } from '../commands/useDocumentState';

const BLOCK_LABELS: Record<string, string> = {
  codeBlock: '코드 블록',
  taskItem: '확인란 목록',
  listItem: '목록',
  blockquote: '인용',
  tableCell: '표',
  tableHeader: '표',
  footnoteDefinition: '각주',
};

// 커서가 놓인 가장 안쪽 블록의 종류를 사람이 읽는 이름으로 바꾼다.
function currentBlockLabel(editor: Editor): string {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth >= 1; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === 'heading') return `제목 ${node.attrs.level}`;
    const label = BLOCK_LABELS[node.type.name];
    if (label) return label;
  }
  return '본문';
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function useStatusState(editor: Editor | null) {
  return useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return { words: 0, characters: 0, withSpaces: 0, selected: 0, block: '본문' };
      const text = current.getText({ blockSeparator: '\n' });
      const { from, to } = current.state.selection;
      return {
        words: countWords(text),
        characters: text.replace(/\s/g, '').length,
        withSpaces: text.replace(/\n/g, '').length,
        selected: current.state.doc.textBetween(from, to, '\n').length,
        block: currentBlockLabel(current),
      };
    },
  });
}

export function StatusBar({ editor }: { editor: Editor | null }) {
  const status = useStatusState(editor);
  const document = useDocumentState();

  return (
    <footer
      className="flex h-6 shrink-0 select-none items-center gap-4 border-t border-chrome-border bg-chrome px-3 text-[12px] text-ink"
      aria-label="상태 표시줄"
    >
      <span className="max-w-[40%] truncate" title={document.path ?? document.name}>
        {document.name}
      </span>
      <span>단어 {status?.words ?? 0}개</span>
      <span title={`공백 포함 ${status?.withSpaces ?? 0}자`}>글자 {status?.characters ?? 0}자</span>
      {status && status.selected > 0 && <span>선택 {status.selected}자</span>}
      <span className="ml-auto">{status?.block ?? '본문'}</span>
      <span>Markdown</span>
    </footer>
  );
}
