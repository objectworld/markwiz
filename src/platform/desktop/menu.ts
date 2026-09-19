import type { Editor } from '@tiptap/core';
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { loadKeymap } from '../../commands/keymap';
import { buildMenuModel, type MenuEntry } from '../../menu/menuModel';

async function buildEntry(entry: MenuEntry, editor: Editor): Promise<MenuItem | PredefinedMenuItem | Submenu> {
  if (entry.kind === 'separator') return PredefinedMenuItem.new({ item: 'Separator' });
  if (entry.kind === 'submenu') {
    const items = await Promise.all(entry.entries.map((child) => buildEntry(child, editor)));
    return Submenu.new({ text: entry.text, items });
  }
  return MenuItem.new({
    id: entry.id,
    // accelerator를 등록하지 않는 항목은 단축키를 라벨 옆에 글자로만 보여준다.
    text: entry.shortcut && !entry.accelerator ? `${entry.text}\t${entry.shortcut}` : entry.text,
    accelerator: entry.accelerator,
    action: () => entry.run(editor),
  });
}

export async function installNativeMenu(editor: Editor): Promise<void> {
  const groups = await Promise.all(
    buildMenuModel(loadKeymap()).map(async (group) => {
      const items = await Promise.all(group.entries.map((entry) => buildEntry(entry, editor)));
      return Submenu.new({ text: group.text, items });
    }),
  );
  const menu = await Menu.new({ items: groups });
  await menu.setAsAppMenu();
}
