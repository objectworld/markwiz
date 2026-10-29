import { useCallback, useEffect, useState } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import type { Editor as TiptapEditor } from '@tiptap/core';
import { COMMAND_IDS, type CommandId } from '../commands/commandIds';
import { detectPlatform, getShortcutForPlatform, loadKeymap } from '../commands/keymap';
import { executeCommand } from '../commands/registry';
import { matchesShortcut } from '../commands/shortcutFormat';
import { useTabsState } from '../commands/tabsState';
import { getViewState, setViewState, useViewState } from '../commands/viewState';
import { useLanguage } from '../i18n/i18n';
import { AboutDialog } from '../menu/AboutDialog';
import { HelpDialog } from '../menu/HelpDialog';
import { MenuBar } from '../menu/MenuBar';
import { Ribbon } from '../ribbon/Ribbon';
import { StatusBar } from '../ribbon/StatusBar';
import { CloseTabDialog } from './CloseTabDialog';
import { DocumentPane } from './DocumentPane';
import { InsertDialog } from './InsertDialog';
import { Sidebar } from './Sidebar';
import { TabBar } from './TabBar';
import '../styles/editor.css';

// 앱 레벨 단축키(파일/보기). 에디터에 포커스가 없을 때를 위한 전역 처리 대상이다.
const APP_COMMAND_IDS = COMMAND_IDS.filter(
  (id): id is CommandId => id.startsWith('view.') || id.startsWith('file.'),
);

// OS가 그리는 메뉴 바는 색을 바꿀 수 없어, macOS 데스크탑(화면 맨 위 네이티브 메뉴)만 빼고
// 데스크탑(Windows/Linux)과 웹 모두 앱 안 메뉴 바를 쓴다. 웹에는 네이티브 메뉴가 없다.
const USE_IN_APP_MENU = !isTauri() || detectPlatform() !== 'mac';

export function Editor() {
  const { tabs, activeId } = useTabsState();
  const view = useViewState();
  useLanguage();

  // 지금 화면에 살아 있는 탭 수만큼의 Tiptap Editor 인스턴스. 각 DocumentPane이 자기 것을 등록/해제한다.
  const [editorsById, setEditorsById] = useState<ReadonlyMap<string, TiptapEditor>>(new Map());
  const registerEditor = useCallback((id: string, editor: TiptapEditor | null) => {
    setEditorsById((prev) => {
      const next = new Map(prev);
      if (editor) next.set(id, editor);
      else next.delete(id);
      return next;
    });
  }, []);
  const activeEditor = editorsById.get(activeId) ?? null;
  const activeTab = tabs.find((tab) => tab.id === activeId) ?? tabs[0];

  // 설치 프로그램에서 고른 언어를 기본 언어로 적용한다(사용자가 직접 고른 언어가 없을 때만).
  useEffect(() => {
    if (!isTauri()) return;
    void import('../platform/desktop/installerLanguage').then((m) => m.applyInstallerLanguage()).catch((error: unknown) => {
      console.error('[markwiz] failed to read the installer language', error);
    });
  }, []);

  // 에디터에 포커스가 없을 때(소스 모드 textarea, 웹, 앱 안 메뉴 바 사용 시)도 파일/보기 단축키가 동작하도록 한다.
  // 에디터가 이미 처리한 키(defaultPrevented)는 건너뛰어 두 번 실행되지 않게 한다.
  useEffect(() => {
    if (!activeEditor) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const open = getViewState();
      if (event.defaultPrevented || open.help || open.about || open.insert || open.closeTabConfirm) return;
      const keymap = loadKeymap();
      const id = APP_COMMAND_IDS.find((candidate) => {
        const entry = keymap[candidate];
        return entry && matchesShortcut(event, getShortcutForPlatform(entry));
      });
      if (!id) return;
      event.preventDefault();
      executeCommand(id, activeEditor);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeEditor]);

  useEffect(() => {
    if (!activeEditor || !isTauri() || USE_IN_APP_MENU) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void import('../platform/desktop/menu')
      .then((m) => m.installNativeMenu(activeEditor))
      .then((unsubscribe) => {
        if (cancelled) unsubscribe();
        else dispose = unsubscribe;
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [activeEditor]);

  // .md 파일 연결로 실행됐을 때(탐색기 더블클릭) 그 파일을 연다. 메뉴 바 종류와 무관하게 항상 켠다.
  useEffect(() => {
    if (!activeEditor || !isTauri()) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void import('../platform/desktop/startupFile')
      .then((m) => m.installStartupFileHandling(activeEditor))
      .then((unlisten) => {
        if (cancelled) unlisten();
        else dispose = unlisten;
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [activeEditor]);

  useEffect(() => {
    const title = `${activeTab.dirty ? '• ' : ''}${activeTab.name} - Markwiz`;
    window.document.title = title;
    if (isTauri()) void import('../platform/desktop/windowTitle').then((m) => m.setWindowTitle(title));
  }, [activeTab.name, activeTab.dirty]);

  return (
    <div className="flex h-screen flex-col bg-canvas">
      {USE_IN_APP_MENU && <MenuBar editor={activeEditor} showRecent={isTauri()} />}
      {/* editor가 null에서 생성되는 순간 useEditorState가 초기 스냅샷을 다시 계산하지 않으므로 key로 다시 마운트한다. */}
      <Ribbon key={activeEditor ? 'ribbon-ready' : 'ribbon-loading'} editor={activeEditor} />
      <TabBar editors={editorsById} />
      <div className="flex min-h-0 flex-1">
        {view.sidebar && activeEditor && <Sidebar editor={activeEditor} />}
        {/* 열려 있는 탭마다 하나씩, 활성 탭만 보이게 둔다(실행 취소 기록/스크롤 유지를 위해 비활성 탭도 계속 마운트). */}
        {tabs.map((tab) => (
          <DocumentPane key={tab.id} tab={tab} isActive={tab.id === activeId} onEditorReady={registerEditor} />
        ))}
      </div>
      {view.insert && activeEditor && (
        <InsertDialog editor={activeEditor} request={view.insert} onClose={() => setViewState({ insert: null })} />
      )}
      {view.about && <AboutDialog onClose={() => setViewState({ about: false })} />}
      {view.help && activeEditor && <HelpDialog editor={activeEditor} onClose={() => setViewState({ help: false })} />}
      {view.closeTabConfirm && (
        <CloseTabDialog tabId={view.closeTabConfirm} editors={editorsById} onClose={() => setViewState({ closeTabConfirm: null })} />
      )}
      <StatusBar key={activeEditor ? 'status-ready' : 'status-loading'} editor={activeEditor} />
    </div>
  );
}
