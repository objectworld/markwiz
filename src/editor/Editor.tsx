import { EditorContent, useEditor } from '@tiptap/react';
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

  return <EditorContent editor={editor} />;
}
