import type { Editor } from '@tiptap/core';
import { parseMarkdown } from '../markdown/parser';
import { getPlatform } from '../platform';
import { basename, type OpenedDocument, type PlatformAPI } from '../platform/types';
import { getDocumentState, setDocumentState } from './documentState';
import { addRecentFile, removeRecentFile } from './recentFiles';
import { registerCommand } from './registry';
import { getMarkdown, syncSourceText } from './viewCommands';
import { showNotice } from './viewState';

// 문서를 화면에 올린다. 상대 경로 이미지는 그릴 때 문서 위치를 기준으로 풀리므로
// 내용을 넣기 전에 문서 경로를 먼저 갱신해야 한다(순서 바꾸지 말 것).
function showDocument(editor: Editor, opened: OpenedDocument): void {
  const doc = parseMarkdown(editor.schema, opened.content);
  setDocumentState({ path: opened.path, name: opened.name });
  editor.commands.setContent(doc.toJSON());
  syncSourceText(editor);
}

// 경로로 다시 열 수 있는 플랫폼(데스크탑)에서만 최근 파일로 기록한다. 웹의 "경로"는 파일명일 뿐이라 기록하지 않는다.
function rememberFile(platform: PlatformAPI, path: string | null): void {
  if (platform.openFileAt && path) addRecentFile({ path, name: basename(path) });
}

registerCommand('file.new', (editor) => {
  editor.commands.clearContent(true);
  setDocumentState({ path: null, name: 'untitled.md' });
  syncSourceText(editor);
});

registerCommand('file.open', async (editor) => {
  const platform = await getPlatform();
  const opened = await platform.openFile();
  if (!opened) return false;

  showDocument(editor, opened);
  rememberFile(platform, opened.path);
});

// 파일 > 최근에 연 파일에서 고른 항목. 파일이 없어졌거나 읽을 수 없으면 목록에서 빼고 상태바에 알린다.
export async function openRecentFile(editor: Editor, path: string): Promise<boolean> {
  const platform = await getPlatform();
  if (!platform.openFileAt) return false;

  let opened: OpenedDocument;
  try {
    opened = await platform.openFileAt(path);
  } catch (error) {
    console.error(`[markwiz] failed to open recent file: ${path}`, error);
    removeRecentFile(path);
    showNotice(`파일을 열 수 없어 최근 목록에서 뺐습니다: ${basename(path)}`);
    return false;
  }

  showDocument(editor, opened);
  rememberFile(platform, opened.path);
  return true;
}

registerCommand('file.save', async (editor) => {
  const platform = await getPlatform();
  const markdown = getMarkdown(editor);
  const current = getDocumentState();

  if (!current.path) {
    const saved = await platform.saveFileAs(markdown, current.name);
    if (saved) {
      setDocumentState(saved);
      rememberFile(platform, saved.path);
    }
    return;
  }

  await platform.saveFile(current.path, markdown);
});

registerCommand('file.saveAs', async (editor) => {
  const platform = await getPlatform();
  const markdown = getMarkdown(editor);
  const saved = await platform.saveFileAs(markdown, getDocumentState().name);
  if (saved) {
    setDocumentState(saved);
    rememberFile(platform, saved.path);
  }
});
