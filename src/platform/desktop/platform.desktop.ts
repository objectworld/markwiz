import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { basename, type OpenedDocument, type PlatformAPI, type SavedDocument } from '../types';

const MARKDOWN_FILTER = { name: 'Markdown', extensions: ['md', 'markdown'] };

export const desktopPlatform: PlatformAPI = {
  async openFile(): Promise<OpenedDocument | null> {
    const selected = await open({ multiple: false, filters: [MARKDOWN_FILTER] });
    if (!selected || Array.isArray(selected)) return null;

    const content = await readTextFile(selected);
    return { path: selected, name: basename(selected), content };
  },

  async saveFile(path: string, content: string): Promise<void> {
    await writeTextFile(path, content);
  },

  async saveFileAs(content: string, suggestedName: string): Promise<SavedDocument | null> {
    const path = await save({ defaultPath: suggestedName, filters: [MARKDOWN_FILTER] });
    if (!path) return null;

    await writeTextFile(path, content);
    return { path, name: basename(path) };
  },
};
