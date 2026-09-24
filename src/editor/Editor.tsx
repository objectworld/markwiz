import { useEffect, useRef } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { COMMAND_IDS, type CommandId } from '../commands/commandIds';
import { detectPlatform, getShortcutForPlatform, loadKeymap } from '../commands/keymap';
import { executeCommand } from '../commands/registry';
import { matchesShortcut } from '../commands/shortcutFormat';
import { useDocumentState } from '../commands/useDocumentState';
import { getViewState, setViewState, useViewState } from '../commands/viewState';
import { t, useLanguage } from '../i18n/i18n';
import { AboutDialog } from '../menu/AboutDialog';
import { HelpDialog } from '../menu/HelpDialog';
import { MenuBar } from '../menu/MenuBar';
import { Ribbon } from '../ribbon/Ribbon';
import { StatusBar } from '../ribbon/StatusBar';
import { editorExtensions } from './extensions';
import { InsertDialog } from './InsertDialog';
import { Sidebar } from './Sidebar';
import { SourceEditor } from './SourceEditor';
import { scrollCaretToCenter } from './typewriter';
import '../styles/editor.css';

// 앱 레벨 단축키(파일/보기). 에디터에 포커스가 없을 때를 위한 전역 처리 대상이다.
const APP_COMMAND_IDS = COMMAND_IDS.filter(
  (id): id is CommandId => id.startsWith('view.') || id.startsWith('file.'),
);

// OS가 그리는 메뉴 바는 색을 바꿀 수 없어, macOS(화면 맨 위 메뉴)를 뺀 데스크탑은 앱 안 메뉴 바를 쓴다.
const USE_IN_APP_MENU = isTauri() && detectPlatform() !== 'mac';

export function Editor() {
  const editor = useEditor({
    extensions: editorExtensions,
    content: t('editor.initialContent'),
    immediatelyRender: false,
  });
  const document = useDocumentState();
  const view = useViewState();
  const scrollRef = useRef<HTMLElement>(null);
  const language = useLanguage();

  // 설치 프로그램에서 고른 언어를 기본 언어로 적용한다(사용자가 직접 고른 언어가 없을 때만).
  useEffect(() => {
    if (!isTauri()) return;
    void import('../platform/desktop/installerLanguage').then((m) => m.applyInstallerLanguage()).catch((error: unknown) => {
      console.error('[markwiz] failed to read the installer language', error);
    });
  }, []);

  // 아직 손대지 않은 시작 문서(안내 문구)는 언어가 바뀌면 그 언어의 안내 문구로 바꾼다. 직접 고친 문서는 건드리지 않는다.
  const pristineHtml = useRef<string | null>(null);
  useEffect(() => {
    if (!editor) return;
    if (pristineHtml.current !== null && editor.getHTML() === pristineHtml.current) {
      editor.commands.setContent(t('editor.initialContent'), { emitUpdate: false });
    }
    pristineHtml.current = editor.getHTML();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, language]);

  // 에디터에 포커스가 없을 때(소스 모드 textarea, 웹, 앱 안 메뉴 바 사용 시)도 파일/보기 단축키가 동작하도록 한다.
  // 에디터가 이미 처리한 키(defaultPrevented)는 건너뛰어 두 번 실행되지 않게 한다.
  useEffect(() => {
    if (!editor) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const open = getViewState();
      if (event.defaultPrevented || open.help || open.about || open.insert) return;
      const keymap = loadKeymap();
      const id = APP_COMMAND_IDS.find((candidate) => {
        const entry = keymap[candidate];
        return entry && matchesShortcut(event, getShortcutForPlatform(entry));
      });
      if (!id) return;
      event.preventDefault();
      executeCommand(id, editor);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [editor]);

  // 타자기 모드: 캐럿이 움직일 때마다 현재 줄을 화면 세로 중앙으로 맞춘다.
  useEffect(() => {
    if (!editor || !view.typewriterMode || view.sourceMode) return;
    const recenter = () => {
      if (scrollRef.current) scrollCaretToCenter(editor, scrollRef.current);
    };
    recenter();
    editor.on('selectionUpdate', recenter);
    editor.on('update', recenter);
    return () => {
      editor.off('selectionUpdate', recenter);
      editor.off('update', recenter);
    };
  }, [editor, view.typewriterMode, view.sourceMode]);

  useEffect(() => {
    if (!editor || !isTauri() || USE_IN_APP_MENU) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void import('../platform/desktop/menu')
      .then((m) => m.installNativeMenu(editor))
      .then((unsubscribe) => {
        if (cancelled) unsubscribe();
        else dispose = unsubscribe;
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [editor]);

  // .md 파일 연결로 실행됐을 때(탐색기 더블클릭) 그 파일을 연다. 메뉴 바 종류와 무관하게 항상 켠다.
  useEffect(() => {
    if (!editor || !isTauri()) return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    void import('../platform/desktop/startupFile')
      .then((m) => m.installStartupFileHandling(editor))
      .then((unlisten) => {
        if (cancelled) unlisten();
        else dispose = unlisten;
      });
    return () => {
      cancelled = true;
      dispose?.();
    };
  }, [editor]);

  useEffect(() => {
    const title = `${document.name} - Markwiz`;
    window.document.title = title;
    if (isTauri()) void import('../platform/desktop/windowTitle').then((m) => m.setWindowTitle(title));
  }, [document.name]);

  return (
    <div className="flex h-screen flex-col bg-canvas">
      {USE_IN_APP_MENU && <MenuBar editor={editor} />}
      {/* editor가 null에서 생성되는 순간 useEditorState가 초기 스냅샷을 다시 계산하지 않으므로 key로 다시 마운트한다. */}
      <Ribbon key={editor ? 'ribbon-ready' : 'ribbon-loading'} editor={editor} />
      <div className="flex min-h-0 flex-1">
        {view.sidebar && editor && <Sidebar editor={editor} />}
        {/* Word처럼 회색 작업 영역 위에 흰 종이 한 장이 놓인 모양. 종이의 빈 곳을 눌러도 에디터에 포커스가 간다. */}
        <main
          ref={scrollRef}
          className={`flex-1 overflow-y-auto py-6 ${view.focusMode ? 'markwiz-focus-mode' : ''}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) editor?.commands.focus('end');
          }}
        >
          {view.sourceMode && <SourceEditor />}
          {/* 소스 모드에서도 에디터(다이어그램 NodeView 포함)를 언마운트하지 않고 숨기기만 한다. */}
          <div
            hidden={view.sourceMode}
            className="markwiz-paper mx-auto min-h-[1000px] w-[816px] max-w-[calc(100%-32px)] border border-chrome-border bg-white px-[72px] py-[72px] shadow-[0_1px_3px_rgba(61,57,41,0.12)]"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) editor?.commands.focus('end');
            }}
          >
            <EditorContent editor={editor} />
          </div>
          {/* 타자기 모드에서 문서 끝 줄도 화면 중앙까지 올라올 수 있도록 여백을 둔다. */}
          {view.typewriterMode && <div aria-hidden className="markwiz-typewriter-spacer" style={{ height: '50vh' }} />}
        </main>
      </div>
      {view.insert && editor && (
        <InsertDialog editor={editor} request={view.insert} onClose={() => setViewState({ insert: null })} />
      )}
      {view.about && <AboutDialog onClose={() => setViewState({ about: false })} />}
      {view.help && editor && <HelpDialog editor={editor} onClose={() => setViewState({ help: false })} />}
      <StatusBar key={editor ? 'status-ready' : 'status-loading'} editor={editor} />
    </div>
  );
}
