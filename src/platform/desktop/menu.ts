import type { Editor } from '@tiptap/core';
import { Menu, MenuItem, Submenu } from '@tauri-apps/api/menu';
import type { CommandId } from '../../commands/commandIds';
import { getShortcutForPlatform, loadKeymap } from '../../commands/keymap';
import { executeCommand } from '../../commands/registry';
import { toTauriAccelerator } from '../../commands/shortcutFormat';

interface MenuCommandSpec {
  id: CommandId;
  label: string;
}

// CLAUDE.md 3항: "앱 레벨 단축키(파일/뷰 관련)는 Tauri 네이티브 메뉴에 바인딩".
// 서식 관련 커맨드는 CommandKeymap(Tiptap addKeyboardShortcuts)만 담당하므로
// 여기서는 file.*/view.*만 다룬다. accelerator도 keymap.json 값을 그대로 재사용해
// 두 바인딩 레이어가 같은 소스를 참조하게 한다.
const FILE_MENU_COMMANDS: MenuCommandSpec[] = [
  { id: 'file.new', label: 'New' },
  { id: 'file.open', label: 'Open…' },
  { id: 'file.save', label: 'Save' },
  { id: 'file.saveAs', label: 'Save As…' },
];

const VIEW_MENU_COMMANDS: MenuCommandSpec[] = [
  { id: 'view.toggleSidebar', label: 'Toggle Sidebar' },
  { id: 'view.outline', label: 'Outline' },
  { id: 'view.sourceMode', label: 'Source Code Mode' },
  { id: 'view.focusMode', label: 'Focus Mode' },
  { id: 'view.typewriterMode', label: 'Typewriter Mode' },
];

async function buildSubmenu(text: string, commands: MenuCommandSpec[], editor: Editor): Promise<Submenu> {
  const keymap = loadKeymap();
  const items = await Promise.all(
    commands.map((command) => {
      const entry = keymap[command.id];
      const accelerator = entry ? toTauriAccelerator(getShortcutForPlatform(entry)) : undefined;
      return MenuItem.new({
        id: command.id,
        text: command.label,
        accelerator,
        action: () => executeCommand(command.id, editor),
      });
    }),
  );
  return Submenu.new({ text, items });
}

export async function installNativeMenu(editor: Editor): Promise<void> {
  const fileMenu = await buildSubmenu('File', FILE_MENU_COMMANDS, editor);
  const viewMenu = await buildSubmenu('View', VIEW_MENU_COMMANDS, editor);
  const menu = await Menu.new({ items: [fileMenu, viewMenu] });
  await menu.setAsAppMenu();
}
