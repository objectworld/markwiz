import { registerCommand } from './registry';
import { setViewState } from './viewState';

// format.* 커맨드만 등록한다. file.*는 fileCommands.ts, view.*는 viewCommands.ts에서 등록한다.

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

// 링크/이미지는 주소 입력 + 파일 선택이 필요해 window.prompt 대신 삽입 창(InsertDialog)을 연다.
registerCommand('format.hyperlink', (editor) => {
  const { from, to } = editor.state.selection;
  setViewState({
    insert: {
      kind: 'link',
      url: (editor.getAttributes('link').href as string | undefined) ?? '',
      hasSelection: from !== to || editor.isActive('link'),
    },
  });
});

registerCommand('format.image', () => setViewState({ insert: { kind: 'image', url: '', hasSelection: false } }));
