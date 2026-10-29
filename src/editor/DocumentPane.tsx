import { useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { Editor } from '@tiptap/core';
import { useEditor, EditorContent } from '@tiptap/react';
import { patchTab, takePendingContent, type DocumentTab } from '../commands/tabsState';
import { useViewState } from '../commands/viewState';
import { t, useLanguage } from '../i18n/i18n';
import { parseMarkdown } from '../markdown/parser';
import { editorExtensions } from './extensions';
import { SourceEditor } from './SourceEditor';
import { scrollCaretToCenter } from './typewriter';

// 탭 하나를 그린다. 활성 탭이 아니어도 계속 마운트된 채로 숨겨 둔다(hidden=display:none) —
// 그래야 그 탭의 실행 취소 기록, 커서, 스크롤 위치, 다이어그램 NodeView 상태가 탭을
// 전환해도 그대로 남는다. 다른 탭으로 옮겨 간 뒤 React가 이 컴포넌트를 내리면(탭을 닫을 때만)
// 비로소 Tiptap 에디터도 정리된다.
export function DocumentPane({
  tab,
  isActive,
  onEditorReady,
}: {
  tab: DocumentTab;
  isActive: boolean;
  onEditorReady: (id: string, editor: Editor | null) => void;
}) {
  // 탭이 생길 때 한 번만 꺼내 쓰는 시작 콘텐츠. 리마운트되지 않는 한 다시 계산하지 않는다.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const initialContent = useMemo(() => takePendingContent(tab.id), [tab.id]);
  const editor = useEditor({
    extensions: editorExtensions,
    // markdown은 아직 만들어지지 않은 이 에디터의 schema가 필요해서, 생성 직후 레이아웃 이펙트에서 채운다.
    content: initialContent.kind === 'html' ? initialContent.html : '',
    immediatelyRender: false,
  });
  const scrollRef = useRef<HTMLElement>(null);
  const view = useViewState();
  const language = useLanguage();

  // 파일을 열어서 만들어진 탭은 마크다운 원문을 들고 있다가, 이 에디터의 schema가 생기는 시점에
  // (=에디터가 만들어진 직후) 한 번 파싱해 넣는다. 화면에 그리기 전에 끝내야 빈 문서가 잠깐
  // 보이지 않으므로 useLayoutEffect를 쓴다. 불러오기라 dirty 표시는 켜지 않는다(emitUpdate:false).
  useLayoutEffect(() => {
    if (!editor || initialContent.kind !== 'markdown') return;
    editor.commands.setContent(parseMarkdown(editor.schema, initialContent.markdown).toJSON(), { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  useEffect(() => {
    onEditorReady(tab.id, editor);
    return () => onEditorReady(tab.id, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab.id, editor]);

  // 이미지의 상대 경로/file:// 주소는 "이 탭"의 문서 위치를 기준으로 풀어야 한다(전역 활성 탭 기준이 아니다).
  useEffect(() => {
    if (editor) editor.storage.documentMeta.path = tab.path;
  }, [editor, tab.path]);

  // 사용자가 실제로 편집했을 때만 탭에 바뀐 내용이 있다고 표시한다. 파일을 불러오는 동안은
  // showDocument()가 documentMeta.loading을 켜 두므로 그 사이의 'update'는 건너뛴다.
  useEffect(() => {
    if (!editor) return;
    const onUpdate = () => {
      if (!editor.storage.documentMeta.loading) patchTab(tab.id, { dirty: true });
    };
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
    };
  }, [editor, tab.id]);

  // 아직 손대지 않은 환영 문서(맨 처음 탭)는 언어가 바뀌면 그 언어의 안내 문구로 바꾼다.
  useEffect(() => {
    if (!editor || initialContent.kind !== 'html' || tab.dirty) return;
    editor.commands.setContent(t('editor.initialContent'), { emitUpdate: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor, language]);

  // 타자기 모드: 이 탭이 화면에 보일 때만 캐럿을 세로 중앙으로 맞춘다.
  useEffect(() => {
    if (!editor || !isActive || !view.typewriterMode || view.sourceMode) return;
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
  }, [editor, isActive, view.typewriterMode, view.sourceMode]);

  const showSource = isActive && view.sourceMode;

  return (
    <main
      ref={scrollRef}
      hidden={!isActive}
      className={`flex-1 overflow-y-auto py-6 ${isActive && view.focusMode ? 'markwiz-focus-mode' : ''}`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) editor?.commands.focus('end');
      }}
    >
      {showSource && <SourceEditor />}
      {/* 소스 모드에서도 에디터(다이어그램 NodeView 포함)를 언마운트하지 않고 숨기기만 한다. */}
      <div
        hidden={showSource}
        className="markwiz-paper mx-auto min-h-[1000px] w-[816px] max-w-[calc(100%-32px)] border border-chrome-border bg-white px-[72px] py-[72px] shadow-[0_1px_3px_rgba(61,57,41,0.12)]"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) editor?.commands.focus('end');
        }}
      >
        <EditorContent editor={editor} />
      </div>
      {/* 타자기 모드에서 문서 끝 줄도 화면 중앙까지 올라올 수 있도록 여백을 둔다. */}
      {isActive && view.typewriterMode && <div aria-hidden className="markwiz-typewriter-spacer" style={{ height: '50vh' }} />}
    </main>
  );
}
