import { Extension } from '@tiptap/core';
import { COMMAND_IDS } from '../../commands/commandIds';
import { getShortcutForPlatform, loadKeymap } from '../../commands/keymap';
import { executeCommand } from '../../commands/registry';
import { toProseMirrorShortcut } from '../../commands/shortcutFormat';
import '../../commands/defaultCommands';
import '../../commands/fileCommands';

// keymap.json(단일 소스)을 커맨드 레지스트리와 연결하는 계층.
// 포맷 단축키는 여기서 Tiptap addKeyboardShortcuts()에 바인딩하고,
// 파일/뷰 단축키는 M5에서 Tauri 네이티브 메뉴 accelerator에도 같은
// keymap.json을 사용해 동일한 커맨드 ID로 바인딩할 예정이다.
export const CommandKeymap = Extension.create({
  name: 'commandKeymap',

  addKeyboardShortcuts() {
    const keymap = loadKeymap();
    const shortcuts: Record<string, () => boolean> = {};

    for (const id of COMMAND_IDS) {
      const entry = keymap[id];
      if (!entry) continue;

      const combo = getShortcutForPlatform(entry);
      const pmShortcut = toProseMirrorShortcut(combo);
      shortcuts[pmShortcut] = () => executeCommand(id, this.editor);
    }

    return shortcuts;
  },
});
