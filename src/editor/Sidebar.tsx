import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { t, useLanguage } from '../i18n/i18n';

interface OutlineItem {
  level: number;
  text: string;
  pos: number;
}

function collectHeadings(editor: Editor): OutlineItem[] {
  const items: OutlineItem[] = [];
  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'heading') items.push({ level: node.attrs.level as number, text: node.textContent, pos });
    return false;
  });
  return items;
}

export function Sidebar({ editor }: { editor: Editor }) {
  useLanguage();
  const headings = useEditorState({ editor, selector: ({ editor: current }) => collectHeadings(current!) }) ?? [];
  const minLevel = headings.length ? Math.min(...headings.map((heading) => heading.level)) : 1;

  return (
    <aside
      className="flex w-64 shrink-0 select-none flex-col border-r border-chrome-border bg-chrome text-ink"
      aria-label={t('sidebar.aria')}
    >
      <div className="border-b border-chrome-border px-3 py-2 text-[12px] font-medium text-ink-muted">{t('sidebar.title')}</div>
      <nav className="flex-1 overflow-y-auto py-1" aria-label={t('sidebar.navAria')}>
        {headings.length === 0 && <p className="px-3 py-2 text-[12px] text-ink-muted">{t('sidebar.empty')}</p>}
        {headings.map((heading) => (
          <button
            key={heading.pos}
            type="button"
            title={heading.text}
            onClick={() => editor.chain().focus().setTextSelection(heading.pos + 1).scrollIntoView().run()}
            style={{ paddingLeft: 12 + (heading.level - minLevel) * 14 }}
            className="block w-full truncate py-1 pr-3 text-left text-[13px] hover:bg-chrome-hover"
          >
            {heading.text || t('sidebar.emptyHeading')}
          </button>
        ))}
      </nav>
    </aside>
  );
}
