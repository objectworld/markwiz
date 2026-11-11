import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import {
  clampSidebarWidth,
  getViewState,
  saveSidebarWidth,
  setViewState,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
  useViewState,
} from '../commands/viewState';
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
  const { sidebarWidth } = useViewState();
  const headings = useEditorState({ editor, selector: ({ editor: current }) => collectHeadings(current!) }) ?? [];
  const minLevel = headings.length ? Math.min(...headings.map((heading) => heading.level)) : 1;

  return (
    <aside
      style={{ width: sidebarWidth }}
      className="relative flex shrink-0 select-none flex-col border-r border-chrome-border bg-chrome text-ink"
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
      <SidebarResizer width={sidebarWidth} />
    </aside>
  );
}

// 개요 영역 오른쪽 경계의 크기 조절 손잡이. 마우스로 끌거나, 포커스를 두고 ←/→(Shift는 큰 폭), Home/End로 조절하고
// 더블클릭하면 기본 크기로 돌아간다.
function SidebarResizer({ width }: { width: number }) {
  const commit = (next: number) => setViewState({ sidebarWidth: clampSidebarWidth(next) });

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={t('sidebar.resize')}
      title={t('sidebar.resize')}
      aria-valuenow={width}
      aria-valuemin={SIDEBAR_MIN_WIDTH}
      aria-valuemax={SIDEBAR_MAX_WIDTH}
      tabIndex={0}
      className="absolute inset-y-0 -right-1 z-10 w-2 cursor-col-resize touch-none hover:bg-accent/30 focus-visible:bg-accent/40 focus-visible:outline-none"
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!event.currentTarget.hasPointerCapture?.(event.pointerId)) return;
        // 개요 영역의 왼쪽 가장자리를 기준으로 포인터 위치가 곧 새 폭이다.
        const left = event.currentTarget.parentElement!.getBoundingClientRect().left;
        commit(event.clientX - left);
      }}
      onPointerUp={() => saveSidebarWidth(getViewState().sidebarWidth)}
      onDoubleClick={() => {
        commit(SIDEBAR_DEFAULT_WIDTH);
        saveSidebarWidth(SIDEBAR_DEFAULT_WIDTH);
      }}
      onKeyDown={(event) => {
        const step = event.shiftKey ? 64 : 16;
        let next: number;
        if (event.key === 'ArrowLeft') next = width - step;
        else if (event.key === 'ArrowRight') next = width + step;
        else if (event.key === 'Home') next = SIDEBAR_MIN_WIDTH;
        else if (event.key === 'End') next = SIDEBAR_MAX_WIDTH;
        else return;
        event.preventDefault();
        commit(next);
        saveSidebarWidth(clampSidebarWidth(next));
      }}
    />
  );
}
