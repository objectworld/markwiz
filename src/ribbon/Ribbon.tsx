import type { ReactNode } from 'react';
import type { Editor } from '@tiptap/core';
import { useEditorState } from '@tiptap/react';
import { executeCommand } from '../commands/registry';
import { useViewState } from '../commands/viewState';
import { RibbonButton } from './RibbonButton';
import {
  activeStyleValue,
  diagramActions,
  exportActions,
  fileActions,
  fontActions,
  historyActions,
  insertActions,
  paragraphActions,
  STYLE_OPTIONS,
  viewActions,
  type RibbonAction,
} from './ribbonActions';

const ALL_ACTIONS: RibbonAction[] = [
  ...fileActions,
  ...historyActions,
  ...fontActions,
  ...paragraphActions,
  ...insertActions,
  ...diagramActions,
  ...exportActions,
];

interface ButtonState {
  active: boolean;
  disabled: boolean;
}

// 에디터 트랜잭션마다 버튼별 활성/비활성 상태를 다시 계산한다 (Word의 토글 버튼 강조와 동일).
function useRibbonState(editor: Editor | null) {
  return useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const buttons: Record<string, ButtonState> = {};
      for (const action of ALL_ACTIONS) {
        buttons[action.id] = {
          active: current && action.isActive ? action.isActive(current) : false,
          disabled: current && action.isDisabled ? action.isDisabled(current) : false,
        };
      }
      return { buttons, style: current ? activeStyleValue(current) : 'p' };
    },
  });
}

function RibbonGroup({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-between border-r border-chrome-border px-2 py-1 last:border-r-0">
      <div className="flex flex-1 items-center gap-0.5">{children}</div>
      <span className="mt-0.5 text-[11px] leading-none text-ink-muted">{label}</span>
    </div>
  );
}

export function Ribbon({ editor }: { editor: Editor | null }) {
  const state = useRibbonState(editor);
  // 보기 토글은 에디터 트랜잭션과 무관하게 바뀌므로 viewState를 구독해 다시 그린다.
  useViewState();

  const renderButtons = (actions: RibbonAction[]) =>
    actions.map((action) => (
      <RibbonButton
        key={action.id}
        action={action}
        editor={editor}
        active={action.id.startsWith('view.') ? (action.isActive?.(editor!) ?? false) : (state?.buttons[action.id]?.active ?? false)}
        disabled={state?.buttons[action.id]?.disabled ?? false}
      />
    ));

  return (
    <header className="select-none" aria-label="리본">
      <div className="flex h-[76px] overflow-x-auto border-b border-chrome-border bg-chrome px-1 [scrollbar-color:rgba(61,57,41,0.35)_transparent] [scrollbar-width:thin]" role="toolbar" aria-label="서식 도구 모음">
        <RibbonGroup label="파일">{renderButtons(fileActions)}</RibbonGroup>
        <RibbonGroup label="편집">{renderButtons(historyActions)}</RibbonGroup>
        <RibbonGroup label="글꼴">
          <select
            aria-label="스타일"
            value={state?.style ?? 'p'}
            disabled={!editor}
            onChange={(event) => {
              const option = STYLE_OPTIONS.find((candidate) => candidate.value === event.target.value);
              if (editor && option) executeCommand(option.command, editor);
            }}
            className="mr-1 h-8 w-28 rounded border border-chrome-border bg-canvas px-2 text-[13px] text-ink"
          >
            {STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {renderButtons(fontActions)}
        </RibbonGroup>
        <RibbonGroup label="단락">{renderButtons(paragraphActions)}</RibbonGroup>
        <RibbonGroup label="삽입">{renderButtons(insertActions)}</RibbonGroup>
        <RibbonGroup label="다이어그램">{renderButtons(diagramActions)}</RibbonGroup>
        <RibbonGroup label="내보내기">{renderButtons(exportActions)}</RibbonGroup>
        <RibbonGroup label="보기">{renderButtons(viewActions)}</RibbonGroup>
      </div>
    </header>
  );
}
