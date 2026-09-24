import type { Editor } from '@tiptap/core';
import { openRecentFile } from '../commands/fileCommands';
import { getShortcutForPlatform, type KeymapConfig } from '../commands/keymap';
import { clearRecentFiles, folderOf, type RecentFile } from '../commands/recentFiles';
import { executeCommand } from '../commands/registry';
import { toTauriAccelerator } from '../commands/shortcutFormat';
import { setViewState } from '../commands/viewState';
import { getLanguage, LANGUAGES, setLanguage, t } from '../i18n/i18n';
import {
  diagramActions,
  exportActions,
  fileActions,
  fontActions,
  historyActions,
  insertActions,
  paragraphActions,
  actionLabel,
  STYLE_OPTIONS,
  styleOptionLabel,
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
      // 항목 오른쪽에 흐리게 보여줄 보조 글(예: 최근 파일이 있는 폴더)과 마우스를 올렸을 때 보이는 전체 설명
      detail?: string;
      title?: string;
      disabled?: boolean;
      // 값이 있으면 체크 표시가 붙는 항목(예: 현재 언어)
      checked?: boolean;
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
    text: actionLabel(action),
    shortcut: combo,
    accelerator: combo && native ? toTauriAccelerator(combo) : undefined,
    run: action.run,
  };
}

// 서브메뉴 이름은 언어에 따라 달라지므로 상수가 아니라 호출 시점의 언어로 만든다.
export const recentMenuText = (): string => t('menu.recent');
export const exportMenuText = (): string => t('menu.export');

function recentFilesSubmenu(files: readonly RecentFile[]): MenuEntry {
  if (files.length === 0) {
    return {
      kind: 'submenu',
      text: recentMenuText(),
      entries: [{ kind: 'item', id: 'recent.empty', text: t('menu.recentEmpty'), disabled: true, run: () => undefined }],
    };
  }
  return {
    kind: 'submenu',
    text: recentMenuText(),
    entries: [
      ...files.map(
        (file): MenuEntry => ({
          kind: 'item',
          id: `recent:${file.path}`,
          text: file.name,
          detail: folderOf(file.path),
          title: file.path,
          run: (editor) => void openRecentFile(editor, file.path),
        }),
      ),
      { kind: 'separator' },
      { kind: 'item', id: 'recent.clear', text: t('menu.recentClear'), run: () => clearRecentFiles() },
    ],
  };
}

export function buildMenuModel(keymap: KeymapConfig, recentFiles: readonly RecentFile[] = []): MenuGroup[] {
  const entries = (actions: RibbonAction[]) => actions.map((action) => toEntry(action, keymap));

  return [
    {
      text: t('group.file'),
      entries: [
        ...entries(fileActions),
        { kind: 'separator' },
        // 리본에서는 별도 "내보내기" 그룹이지만, 메뉴에서는 Typora처럼 파일 메뉴의 서브메뉴다.
        { kind: 'submenu', text: exportMenuText(), entries: entries(exportActions) },
        recentFilesSubmenu(recentFiles),
      ],
    },
    { text: t('group.edit'), entries: entries(historyActions) },
    {
      text: t('group.font'),
      entries: [
        {
          kind: 'submenu',
          text: t('menu.style'),
          entries: STYLE_OPTIONS.map((option) => ({
            kind: 'item',
            id: option.command,
            text: styleOptionLabel(option),
            run: (editor: Editor) => void executeCommand(option.command, editor),
          })),
        },
        { kind: 'separator' },
        ...entries(fontActions),
      ],
    },
    { text: t('group.paragraph'), entries: entries(paragraphActions) },
    { text: t('group.insert'), entries: entries(insertActions) },
    { text: t('group.diagram'), entries: entries(diagramActions) },
    { text: t('group.view'), entries: entries(viewActions) },
    {
      text: t('group.help'),
      entries: [
        { kind: 'item', id: 'help.readme', text: t('menu.readme'), run: () => setViewState({ help: true }) },
        { kind: 'separator' },
        // 항목 이름은 항상 그 언어 자신의 이름으로 적어야, 잘못 바뀐 언어에서도 되돌릴 수 있다.
        {
          kind: 'submenu',
          text: t('menu.language'),
          entries: LANGUAGES.map(
            (language): MenuEntry => ({
              kind: 'item',
              id: `language.${language.id}`,
              text: language.label,
              checked: getLanguage() === language.id,
              run: () => setLanguage(language.id),
            }),
          ),
        },
        { kind: 'separator' },
        { kind: 'item', id: 'help.about', text: t('menu.about'), run: () => setViewState({ about: true }) },
      ],
    },
  ];
}
