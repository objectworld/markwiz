import type { Editor } from '@tiptap/core';
import { getShortcutForPlatform, type KeymapConfig } from '../commands/keymap';
import { executeCommand } from '../commands/registry';
import { toTauriAccelerator } from '../commands/shortcutFormat';
import { setViewState } from '../commands/viewState';
import {
  diagramActions,
  fileActions,
  fontActions,
  historyActions,
  insertActions,
  paragraphActions,
  STYLE_OPTIONS,
  viewActions,
  type RibbonAction,
} from '../ribbon/ribbonActions';

export type MenuEntry =
  | {
      kind: 'item';
      id: string;
      text: string;
      // 화면에 보여줄 단축키 (keymap.json 값)
      shortcut?: string;
      // 네이티브 메뉴 accelerator. 파일/보기 항목만 갖는다.
      accelerator?: string;
      run: (editor: Editor) => void;
    }
  | { kind: 'separator' }
  | { kind: 'submenu'; text: string; entries: MenuEntry[] };

export interface MenuGroup {
  text: string;
  entries: MenuEntry[];
}

// 메뉴는 리본 툴바와 같은 그룹/항목/이름을 쓰고(ribbonActions.ts가 유일한 소스) 끝에 도움말이 붙는다.
// 앱 안 메뉴 바(MenuBar)와 macOS 네이티브 메뉴(desktop/menu.ts)가 이 모델을 함께 쓴다.
// CLAUDE.md 3항: 파일/보기 커맨드는 네이티브 accelerator로 바인딩한다. 서식 커맨드는 Tiptap 키맵이
// 키를 처리하므로 accelerator를 등록하지 않고 단축키는 표시만 한다(이중 실행 방지).
function toEntry(action: RibbonAction, keymap: KeymapConfig): MenuEntry {
  const combo = action.commandId && keymap[action.commandId] ? getShortcutForPlatform(keymap[action.commandId]) : undefined;
  const native = action.commandId?.startsWith('file.') || action.commandId?.startsWith('view.');
  return {
    kind: 'item',
    id: action.id,
    text: action.label,
    shortcut: combo,
    accelerator: combo && native ? toTauriAccelerator(combo) : undefined,
    run: action.run,
  };
}

export function buildMenuModel(keymap: KeymapConfig): MenuGroup[] {
  const entries = (actions: RibbonAction[]) => actions.map((action) => toEntry(action, keymap));

  return [
    {
      text: '파일',
      entries: entries(fileActions),
    },
    { text: '편집', entries: entries(historyActions) },
    {
      text: '글꼴',
      entries: [
        {
          kind: 'submenu',
          text: '스타일',
          entries: STYLE_OPTIONS.map((option) => ({
            kind: 'item',
            id: option.command,
            text: option.label,
            run: (editor: Editor) => void executeCommand(option.command, editor),
          })),
        },
        { kind: 'separator' },
        ...entries(fontActions),
      ],
    },
    { text: '단락', entries: entries(paragraphActions) },
    { text: '삽입', entries: entries(insertActions) },
    { text: '다이어그램', entries: entries(diagramActions) },
    { text: '보기', entries: entries(viewActions) },
    {
      text: '도움말',
      entries: [{ kind: 'item', id: 'help.readme', text: 'README 보기', run: () => setViewState({ help: true }) }],
    },
  ];
}
