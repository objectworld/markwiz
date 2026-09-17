import { registerCommand } from './registry';

// file.*, view.* 커맨드는 파일 시스템(M5)과 사이드바/아웃라인/포커스 모드
// 같은 아직 만들지 않은 UI(향후 마일스톤)에 연결될 자리만 keymap에
// 마련해 둔다. 지금은 등록하지 않으며, executeCommand가 "구현되지 않음"
// 경고만 남긴다.

registerCommand('format.bold', (editor) => editor.chain().focus().toggleBold().run());
registerCommand('format.italic', (editor) => editor.chain().focus().toggleItalic().run());
registerCommand('format.strike', (editor) => editor.chain().focus().toggleStrike().run());
registerCommand('format.code', (editor) => editor.chain().focus().toggleCode().run());
registerCommand('format.clearFormat', (editor) => editor.chain().focus().unsetAllMarks().clearNodes().run());

registerCommand('format.heading1', (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run());
registerCommand('format.heading2', (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run());
registerCommand('format.heading3', (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run());
registerCommand('format.heading4', (editor) => editor.chain().focus().toggleHeading({ level: 4 }).run());
registerCommand('format.heading5', (editor) => editor.chain().focus().toggleHeading({ level: 5 }).run());
registerCommand('format.heading6', (editor) => editor.chain().focus().toggleHeading({ level: 6 }).run());
registerCommand('format.paragraph', (editor) => editor.chain().focus().setParagraph().run());

registerCommand('format.blockquote', (editor) => editor.chain().focus().toggleBlockquote().run());
registerCommand('format.orderedList', (editor) => editor.chain().focus().toggleOrderedList().run());
registerCommand('format.unorderedList', (editor) => editor.chain().focus().toggleBulletList().run());
registerCommand('format.codeFences', (editor) => editor.chain().focus().toggleCodeBlock().run());
registerCommand('format.table', (editor) =>
  editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
);

registerCommand('format.hyperlink', (editor) => {
  const previousUrl = (editor.getAttributes('link').href as string | undefined) ?? '';
  // eslint-disable-next-line no-alert
  const url = window.prompt('URL', previousUrl || 'https://');
  if (url === null) return false;
  if (url === '') return editor.chain().focus().extendMarkRange('link').unsetLink().run();
  return editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
});

registerCommand('format.image', (editor) => {
  // eslint-disable-next-line no-alert
  const url = window.prompt('Image URL');
  if (!url) return false;
  return editor.chain().focus().setImage({ src: url }).run();
});
