import { useEffect } from 'react';
import { isTauri } from '@tauri-apps/api/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { useDocumentState } from '../commands/useDocumentState';
import { Ribbon } from '../ribbon/Ribbon';
import { StatusBar } from '../ribbon/StatusBar';
import { editorExtensions } from './extensions';
import '../styles/editor.css';

const initialContent = `
  <h1>Markwiz</h1>
  <p>여기에 마크다운을 입력하세요. <strong>굵게</strong>, <em>기울임</em> 같은 기본 서식을 지원합니다.</p>
`;

export function Editor() {
  const editor = useEditor({
    extensions: editorExtensions,
    content: initialContent,
    immediatelyRender: false,
  });
  const document = useDocumentState();

  useEffect(() => {
    if (!editor || !isTauri()) return;
    import('../platform/desktop/menu').then((m) => m.installNativeMenu(editor));
  }, [editor]);

  useEffect(() => {
    window.document.title = `${document.name} - Markwiz`;
  }, [document.name]);

  return (
    <div className="flex h-screen flex-col bg-canvas">
      {/* editor가 null에서 생성되는 순간 useEditorState가 초기 스냅샷을 다시 계산하지 않으므로 key로 다시 마운트한다. */}
      <Ribbon key={editor ? 'ribbon-ready' : 'ribbon-loading'} editor={editor} />
      {/* Word처럼 회색 작업 영역 위에 흰 종이 한 장이 놓인 모양. 종이의 빈 곳을 눌러도 에디터에 포커스가 간다. */}
      <main
        className="flex-1 overflow-y-auto py-6"
        onMouseDown={(event) => {
          if (event.target === event.currentTarget) editor?.commands.focus('end');
        }}
      >
        <div
          className="mx-auto min-h-[1000px] w-[816px] max-w-[calc(100%-32px)] border border-chrome-border bg-white px-[72px] py-[72px] shadow-[0_1px_3px_rgba(61,57,41,0.12)]"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) editor?.commands.focus('end');
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </main>
      <StatusBar key={editor ? 'status-ready' : 'status-loading'} editor={editor} />
    </div>
  );
}
