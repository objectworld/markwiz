import type { Editor } from '@tiptap/core';
import {
  Bold,
  Code,
  FileCode,
  FilePlus,
  FolderOpen,
  Image,
  Italic,
  Link,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Save,
  SaveAll,
  Strikethrough,
  Superscript,
  Table,
  Undo2,
  Waypoints,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { CommandId } from '../commands/commandIds';
import { executeCommand } from '../commands/registry';

export interface RibbonAction {
  id: string;
  label: string;
  icon: LucideIcon;
  // 레지스트리에 등록된 커맨드면 단축키 툴팁을 keymap.json에서 가져오고 실행도 레지스트리로 위임한다.
  commandId?: CommandId;
  run: (editor: Editor) => void;
  isActive?: (editor: Editor) => boolean;
  isDisabled?: (editor: Editor) => boolean;
}

// 레지스트리 커맨드(=단축키가 있는 동작)는 executeCommand로만 실행해 로직 중복을 막고,
// 단축키가 없는 삽입/실행취소 계열만 에디터 커맨드를 직접 호출한다.
function fromCommand(
  commandId: CommandId,
  label: string,
  icon: LucideIcon,
  isActive?: (editor: Editor) => boolean,
): RibbonAction {
  return { id: commandId, commandId, label, icon, run: (editor) => void executeCommand(commandId, editor), isActive };
}

const DIAGRAM_TEMPLATES = {
  mermaid: 'graph TD;\n  A[시작] --> B[끝];',
  plantuml: '@startuml\nAlice -> Bob : Hello\n@enduml',
} as const;

function insertDiagram(editor: Editor, language: keyof typeof DIAGRAM_TEMPLATES) {
  editor
    .chain()
    .focus()
    .insertContent({
      type: 'codeBlock',
      attrs: { language },
      content: [{ type: 'text', text: DIAGRAM_TEMPLATES[language] }],
    })
    .run();
}

export const fileActions: RibbonAction[] = [
  fromCommand('file.new', '새로 만들기', FilePlus),
  fromCommand('file.open', '열기', FolderOpen),
  fromCommand('file.save', '저장', Save),
  fromCommand('file.saveAs', '다른 이름으로 저장', SaveAll),
];

export const historyActions: RibbonAction[] = [
  {
    id: 'edit.undo',
    label: '실행 취소',
    icon: Undo2,
    run: (editor) => void editor.chain().focus().undo().run(),
    isDisabled: (editor) => !editor.can().undo(),
  },
  {
    id: 'edit.redo',
    label: '다시 실행',
    icon: Redo2,
    run: (editor) => void editor.chain().focus().redo().run(),
    isDisabled: (editor) => !editor.can().redo(),
  },
];

export const fontActions: RibbonAction[] = [
  fromCommand('format.bold', '굵게', Bold, (editor) => editor.isActive('bold')),
  fromCommand('format.italic', '기울임', Italic, (editor) => editor.isActive('italic')),
  fromCommand('format.strike', '취소선', Strikethrough, (editor) => editor.isActive('strike')),
  fromCommand('format.code', '인라인 코드', Code, (editor) => editor.isActive('code')),
  fromCommand('format.clearFormat', '서식 지우기', RemoveFormatting),
];

export const paragraphActions: RibbonAction[] = [
  fromCommand('format.unorderedList', '글머리 기호', List, (editor) => editor.isActive('bulletList')),
  fromCommand('format.orderedList', '번호 매기기', ListOrdered, (editor) => editor.isActive('orderedList')),
  {
    id: 'format.taskList',
    label: '확인란 목록',
    icon: ListChecks,
    run: (editor) => void editor.chain().focus().toggleList('taskList', 'taskItem').run(),
    isActive: (editor) => editor.isActive('taskList'),
  },
  fromCommand('format.blockquote', '인용', Quote, (editor) => editor.isActive('blockquote')),
];

export const insertActions: RibbonAction[] = [
  fromCommand('format.table', '표', Table),
  fromCommand('format.image', '그림', Image),
  fromCommand('format.hyperlink', '링크', Link, (editor) => editor.isActive('link')),
  fromCommand('format.codeFences', '코드 블록', FileCode, (editor) => editor.isActive('codeBlock')),
  {
    id: 'insert.horizontalRule',
    label: '구분선',
    icon: Minus,
    run: (editor) => void editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'insert.footnote',
    label: '각주',
    icon: Superscript,
    run: (editor) => void editor.chain().focus().insertFootnote().run(),
  },
];

export const diagramActions: RibbonAction[] = [
  { id: 'insert.mermaid', label: 'Mermaid', icon: Workflow, run: (editor) => insertDiagram(editor, 'mermaid') },
  { id: 'insert.plantuml', label: 'PlantUML', icon: Waypoints, run: (editor) => insertDiagram(editor, 'plantuml') },
];

export const STYLE_OPTIONS = [
  { value: 'p', label: '본문', command: 'format.paragraph' },
  { value: '1', label: '제목 1', command: 'format.heading1' },
  { value: '2', label: '제목 2', command: 'format.heading2' },
  { value: '3', label: '제목 3', command: 'format.heading3' },
  { value: '4', label: '제목 4', command: 'format.heading4' },
  { value: '5', label: '제목 5', command: 'format.heading5' },
  { value: '6', label: '제목 6', command: 'format.heading6' },
] as const satisfies readonly { value: string; label: string; command: CommandId }[];

export function activeStyleValue(editor: Editor): string {
  for (let level = 1; level <= 6; level += 1) {
    if (editor.isActive('heading', { level })) return String(level);
  }
  return 'p';
}
