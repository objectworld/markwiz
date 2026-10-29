import type { Editor } from '@tiptap/core';
import { Plus, X } from 'lucide-react';
import { executeCommand } from '../commands/registry';
import { activateTab, requestCloseTab } from '../commands/tabCommands';
import { useTabsState, type DocumentTab } from '../commands/tabsState';
import { t, useLanguage } from '../i18n/i18n';

// 리본 바로 아래에 한 줄로 늘어선 문서 탭(브라우저/VS Code처럼). 리본의 "탭 없이 한 줄" 규칙은 리본
// 안의 홈/삽입 구분 얘기이고, 여기 탭은 열려 있는 문서를 고르는 전혀 다른 UI라 그 규칙과
// 무관하다(리본은 여전히 한 줄).
export function TabBar({ editors }: { editors: ReadonlyMap<string, Editor> }) {
  const { tabs, activeId } = useTabsState();
  useLanguage();

  return (
    <div
      role="tablist"
      aria-label={t('tab.bar.aria')}
      className="flex h-7 shrink-0 items-stretch overflow-x-auto border-b border-chrome-border bg-chrome [scrollbar-color:rgba(61,57,41,0.35)_transparent] [scrollbar-width:thin]"
    >
      {tabs.map((tab) => (
        <TabButton key={tab.id} tab={tab} active={tab.id === activeId} outgoingEditor={editors.get(activeId) ?? null} />
      ))}
      <button
        type="button"
        title={t('tab.new')}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          const active = editors.get(activeId);
          if (active) executeCommand('file.new', active);
        }}
        className="flex w-7 shrink-0 items-center justify-center text-ink-muted hover:bg-chrome-hover hover:text-ink"
      >
        <Plus size={14} />
      </button>
    </div>
  );
}

function TabButton({ tab, active, outgoingEditor }: { tab: DocumentTab; active: boolean; outgoingEditor: Editor | null }) {
  return (
    <div
      role="tab"
      aria-selected={active}
      title={tab.path ?? tab.name}
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => activateTab(tab.id, outgoingEditor)}
      className={`group flex h-full max-w-[200px] shrink-0 items-center gap-1.5 border-r border-chrome-border pl-3 pr-1.5 text-xs ${
        active ? 'bg-canvas text-ink' : 'text-ink-muted hover:bg-chrome-hover'
      }`}
    >
      {tab.dirty && <span aria-hidden className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />}
      <span className="truncate" aria-label={tab.dirty ? t('tab.unsaved', { name: tab.name }) : tab.name}>
        {tab.name}
      </span>
      <button
        type="button"
        title={t('tab.close', { name: tab.name })}
        onMouseDown={(event) => event.preventDefault()}
        onClick={(event) => {
          event.stopPropagation();
          requestCloseTab(tab.id);
        }}
        className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded opacity-0 hover:bg-chrome-border group-hover:opacity-100"
      >
        <X size={12} />
      </button>
    </div>
  );
}
