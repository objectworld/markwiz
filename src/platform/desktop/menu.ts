import type { Editor } from '@tiptap/core';
import { Menu, MenuItem, PredefinedMenuItem, Submenu } from '@tauri-apps/api/menu';
import { loadKeymap } from '../../commands/keymap';
import { getRecentFiles, subscribeRecentFiles } from '../../commands/recentFiles';
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
    enabled: !entry.disabled,
    action: () => entry.run(editor),
  });
}

async function applyMenu(editor: Editor): Promise<void> {
  const groups = await Promise.all(
    buildMenuModel(loadKeymap(), getRecentFiles()).map(async (group) => {
      const items = await Promise.all(group.entries.map((entry) => buildEntry(entry, editor)));
      return Submenu.new({ text: group.text, items });
    }),
  );
  const menu = await Menu.new({ items: groups });
  await menu.setAsAppMenu();
}

// 네이티브 메뉴는 한 번 만들면 고정이라, 최근 파일 목록이 바뀔 때마다 다시 만든다. 반환값은 구독 해제 함수.
export async function installNativeMenu(editor: Editor): Promise<() => void> {
  await applyMenu(editor);
  return subscribeRecentFiles(() => {
    void applyMenu(editor).catch((error: unknown) => console.error('[markwiz] failed to refresh the menu', error));
  });
}
