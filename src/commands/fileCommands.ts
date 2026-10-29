import type { Editor } from '@tiptap/core';
import { parseMarkdown } from '../markdown/parser';
import { getPlatform } from '../platform';
import { basename, type OpenedDocument, type PlatformAPI } from '../platform/types';
import { t } from '../i18n/i18n';
import { getDocumentState, setDocumentState } from './documentState';
import { addRecentFile, removeRecentFile } from './recentFiles';
import { registerCommand } from './registry';
import { findTabByPath, getActiveTab, openTab, patchTab, setActiveTabId } from './tabsState';
import { getMarkdown, syncSourceText } from './viewCommands';
import { showNotice } from './viewState';

// 문서를 이미 열려 있는 탭(의 에디터)에 그대로 올린다. 상대 경로 이미지는 그릴 때 문서 위치를
// 기준으로 풀리므로 내용을 넣기 전에 문서 경로를 먼저 갱신해야 한다(순서 바꾸지 말 것).
// editor.storage.documentMeta.loading은 이 불러오기가 사용자의 편집이 아니라는 걸 표시해
// DocumentPane의 dirty 추적이 틀리지 않게 한다.
function showDocument(editor: Editor, opened: OpenedDocument): void {
  const doc = parseMarkdown(editor.schema, opened.content);
  setDocumentState({ path: opened.path, name: opened.name });
  editor.storage.documentMeta.loading = true;
  editor.commands.setContent(doc.toJSON());
  editor.storage.documentMeta.loading = false;
  syncSourceText(editor);
}

// 경로로 다시 열 수 있는 플랫폼(데스크탑)에서만 최근 파일로 기록한다. 웹의 "경로"는 파일명일 뿐이라 기록하지 않는다.
function rememberFile(platform: PlatformAPI, path: string | null): void {
  if (platform.openFileAt && path) addRecentFile({ path, name: basename(path) });
}

// 지금 활성 탭이 아직 손대지 않은 빈 "제목 없음" 문서인가. 그렇다면 파일을 열 때 새 탭을
// 더 만들지 않고 이 탭을 그대로 재사용해 탭이 쓸데없이 늘어나지 않게 한다.
function isActiveTabBlank(): boolean {
  const tab = getActiveTab();
  return tab.path === null && !tab.dirty;
}

registerCommand('file.new', () => {
  openTab({ path: null, name: 'untitled.md', content: { kind: 'empty' } });
});

// opened를 화면에 올린다: 이미 같은 경로가 열려 있으면 그 탭으로 옮기고(내용은 다시 읽지 않아
// 그 탭의 편집 중인 내용을 덮어쓰지 않는다), 활성 탭이 비어 있으면 그 탭을 재사용하고,
// 그 외에는 새 탭을 연다. editor는 "지금 활성 탭의 에디터"이고, 재사용/신규 탭 중
// 재사용 경로에서만 쓰인다(신규 탭의 에디터는 아직 만들어지지 않았기 때문).
function loadIntoTabs(editor: Editor, opened: OpenedDocument): void {
  if (opened.path !== null) {
    const existing = findTabByPath(opened.path);
    if (existing) {
      setActiveTabId(existing.id);
      return;
    }
  }

  if (isActiveTabBlank()) {
    showDocument(editor, opened);
    return;
  }

  openTab({ path: opened.path, name: opened.name, content: { kind: 'markdown', markdown: opened.content } });
}

registerCommand('file.open', async (editor) => {
  const platform = await getPlatform();
  const opened = await platform.openFile();
  if (!opened) return false;

  loadIntoTabs(editor, opened);
  rememberFile(platform, opened.path);
});

// 파일 > 최근에 연 파일에서 고른 항목(또는 .md 파일 더블클릭으로 실행됨). 이미 열려 있으면
// 디스크에서 다시 읽지 않고 그 탭으로 옮긴다. 파일이 없어졌거나 읽을 수 없으면 목록에서
// 빼고 상태바에 알린다.
export async function openRecentFile(editor: Editor, path: string): Promise<boolean> {
  const platform = await getPlatform();
  if (!platform.openFileAt) return false;

  const existing = findTabByPath(path);
  if (existing) {
    setActiveTabId(existing.id);
    rememberFile(platform, path);
    return true;
  }

  let opened: OpenedDocument;
  try {
    opened = await platform.openFileAt(path);
  } catch (error) {
    console.error(`[markwiz] failed to open recent file: ${path}`, error);
    removeRecentFile(path);
    showNotice(t('notice.recentRemoved', { name: basename(path) }));
    return false;
  }

  loadIntoTabs(editor, opened);
  rememberFile(platform, opened.path);
  return true;
}

// file.save의 실제 동작. 탭을 닫기 전 저장 확인 창(CloseTabDialog)도 이 함수를 그대로 쓴다 —
// 두 곳 모두 "경로가 없으면 다른 이름으로 저장 대화상자, 취소하면 실패"라는 같은 규칙을
// 따라야 하기 때문이다. 항상 지금 활성 탭을 대상으로 한다(호출 전에 그 탭을 활성화해 둘 것).
// 반환값: 저장이 끝났으면 true, 사용자가 "다른 이름으로 저장" 대화상자를 취소했으면 false.
export async function saveActiveDocument(editor: Editor): Promise<boolean> {
  const platform = await getPlatform();
  const markdown = getMarkdown(editor);
  const current = getDocumentState();
  const activeId = getActiveTab().id;

  if (!current.path) {
    const saved = await platform.saveFileAs(markdown, current.name);
    if (!saved) return false;
    setDocumentState(saved);
    rememberFile(platform, saved.path);
    return true;
  }

  await platform.saveFile(current.path, markdown);
  patchTab(activeId, { dirty: false });
  return true;
}

registerCommand('file.save', (editor) => saveActiveDocument(editor));

registerCommand('file.saveAs', async (editor) => {
  const platform = await getPlatform();
  const markdown = getMarkdown(editor);
  const saved = await platform.saveFileAs(markdown, getDocumentState().name);
  if (saved) {
    setDocumentState(saved);
    rememberFile(platform, saved.path);
  }
});
