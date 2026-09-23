import { open, save } from '@tauri-apps/plugin-dialog';
import { readTextFile, writeFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { pathToFileUrl } from '../localFile';
import {
  basename,
  type BinaryFileFilter,
  type LocalFileKind,
  type OpenedDocument,
  type PickedFile,
  type PlatformAPI,
  type SavedDocument,
} from '../types';

const MARKDOWN_FILTER = { name: 'Markdown', extensions: ['md', 'markdown'] };

const IMAGE_FILTER = { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'bmp', 'avif'] };

export const desktopPlatform: PlatformAPI = {
  localFileKinds: ['image', 'any'],

  async pickLocalFile(kind: LocalFileKind): Promise<PickedFile | null> {
    const selected = await open({ multiple: false, filters: kind === 'image' ? [IMAGE_FILTER] : [] });
    if (!selected || Array.isArray(selected)) return null;
    return { url: pathToFileUrl(selected), name: basename(selected) };
  },

  async openFile(): Promise<OpenedDocument | null> {
    const selected = await open({ multiple: false, filters: [MARKDOWN_FILTER] });
    if (!selected || Array.isArray(selected)) return null;

    const content = await readTextFile(selected);
    return { path: selected, name: basename(selected), content };
  },

  async openFileAt(path: string): Promise<OpenedDocument> {
    const content = await readTextFile(path);
    return { path, name: basename(path), content };
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

  async saveBinaryFileAs(data: Uint8Array, suggestedName: string, filter: BinaryFileFilter): Promise<SavedDocument | null> {
    const path = await save({ defaultPath: suggestedName, filters: [filter] });
    if (!path) return null;

    await writeFile(path, data);
    return { path, name: basename(path) };
  },
};
