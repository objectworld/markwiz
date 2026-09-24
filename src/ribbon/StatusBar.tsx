import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { useDocumentState } from '../commands/useDocumentState';
import { useViewState } from '../commands/viewState';
import { t, useLanguage } from '../i18n/i18n';

const BLOCK_LABEL_KEYS = {
  codeBlock: 'block.codeBlock',
  taskItem: 'block.taskItem',
  listItem: 'block.listItem',
  blockquote: 'block.blockquote',
  tableCell: 'block.table',
  tableHeader: 'block.table',
  footnoteDefinition: 'block.footnote',
} as const;

// 커서가 놓인 가장 안쪽 블록의 종류를 사람이 읽는 이름으로 바꾼다.
function currentBlockLabel(editor: Editor): string {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth >= 1; depth -= 1) {
    const node = $from.node(depth);
    if (node.type.name === 'heading') return t('block.heading', { n: node.attrs.level as number });
    const key = BLOCK_LABEL_KEYS[node.type.name as keyof typeof BLOCK_LABEL_KEYS];
    if (key) return t(key);
  }
  return t('block.body');
}

export function countWords(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

function useStatusState(editor: Editor | null) {
  return useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return { words: 0, characters: 0, withSpaces: 0, selected: 0, block: t('block.body') };
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
  useLanguage();
  const status = useStatusState(editor);
  const document = useDocumentState();
  const { notice } = useViewState();

  return (
    <footer
      className="flex h-6 shrink-0 select-none items-center gap-4 border-t border-chrome-border bg-chrome px-3 text-[12px] text-ink"
      aria-label={t('status.aria')}
    >
      <span className="max-w-[40%] truncate" title={document.path ?? document.name}>
        {document.name}
      </span>
      <span>{t('status.words', { n: status?.words ?? 0 })}</span>
      <span title={t('status.charactersWithSpaces', { n: status?.withSpaces ?? 0 })}>{t('status.characters', { n: status?.characters ?? 0 })}</span>
      {status && status.selected > 0 && <span>{t('status.selected', { n: status.selected })}</span>}
      {notice && (
        <span role="status" className="truncate text-accent">
          {notice}
        </span>
      )}
      <span className="ml-auto">{status?.block ?? t('block.body')}</span>
      <span>Markdown</span>
    </footer>
  );
}
