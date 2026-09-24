import type { Editor } from '@tiptap/core';
import {
  Bold,
  Code,
  FileOutput,
  FileType2,
  Focus,
  FileCode,
  FilePlus,
  FolderOpen,
  Image,
  Italic,
  Link,
  List,
  ListChecks,
  ListTree,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  RemoveFormatting,
  Save,
  SaveAll,
  Strikethrough,
  Superscript,
  Type,
  Table,
  Undo2,
  Waypoints,
  Workflow,
  type LucideIcon,
} from 'lucide-react';
import type { CommandId } from '../commands/commandIds';
import { executeCommand } from '../commands/registry';
import { getViewState } from '../commands/viewState';
import { t } from '../i18n/i18n';
import type { MessageKey } from '../i18n/messages';
import { exportDocx } from '../export/exportDocx';
import { exportPdf } from '../export/exportPdf';

export interface RibbonAction {
  id: string;
  // 표시 이름은 언어에 따라 달라지므로 키만 들고 있고, 화면에 그릴 때 actionLabel()로 옮긴다.
  labelKey: MessageKey;
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
  labelKey: MessageKey,
  icon: LucideIcon,
  isActive?: (editor: Editor) => boolean,
): RibbonAction {
  return { id: commandId, commandId, labelKey, icon, run: (editor) => void executeCommand(commandId, editor), isActive };
}

export function actionLabel(action: Pick<RibbonAction, 'labelKey'>): string {
  return t(action.labelKey);
}

const DIAGRAM_TEMPLATES = {
  mermaid: () => t('diagram.mermaidTemplate'),
  plantuml: () => '@startuml\nAlice -> Bob : Hello\n@enduml',
} as const;

function insertDiagram(editor: Editor, language: keyof typeof DIAGRAM_TEMPLATES) {
  editor
    .chain()
    .focus()
    .insertContent({
      type: 'codeBlock',
      attrs: { language },
      content: [{ type: 'text', text: DIAGRAM_TEMPLATES[language]() }],
    })
    .run();
}

export const fileActions: RibbonAction[] = [
  fromCommand('file.new', 'action.file.new', FilePlus),
  fromCommand('file.open', 'action.file.open', FolderOpen),
  fromCommand('file.save', 'action.file.save', Save),
  fromCommand('file.saveAs', 'action.file.saveAs', SaveAll),
];

export const historyActions: RibbonAction[] = [
  {
    id: 'edit.undo',
    labelKey: 'action.edit.undo',
    icon: Undo2,
    run: (editor) => void editor.chain().focus().undo().run(),
    isDisabled: (editor) => !editor.can().undo(),
  },
  {
    id: 'edit.redo',
    labelKey: 'action.edit.redo',
    icon: Redo2,
    run: (editor) => void editor.chain().focus().redo().run(),
    isDisabled: (editor) => !editor.can().redo(),
  },
];

export const fontActions: RibbonAction[] = [
  fromCommand('format.bold', 'action.format.bold', Bold, (editor) => editor.isActive('bold')),
  fromCommand('format.italic', 'action.format.italic', Italic, (editor) => editor.isActive('italic')),
  fromCommand('format.strike', 'action.format.strike', Strikethrough, (editor) => editor.isActive('strike')),
  fromCommand('format.code', 'action.format.code', Code, (editor) => editor.isActive('code')),
  fromCommand('format.clearFormat', 'action.format.clearFormat', RemoveFormatting),
];

export const paragraphActions: RibbonAction[] = [
  fromCommand('format.unorderedList', 'action.format.unorderedList', List, (editor) => editor.isActive('bulletList')),
  fromCommand('format.orderedList', 'action.format.orderedList', ListOrdered, (editor) => editor.isActive('orderedList')),
  {
    id: 'format.taskList',
    labelKey: 'action.format.taskList',
    icon: ListChecks,
    run: (editor) => void editor.chain().focus().toggleList('taskList', 'taskItem').run(),
    isActive: (editor) => editor.isActive('taskList'),
  },
  fromCommand('format.blockquote', 'action.format.blockquote', Quote, (editor) => editor.isActive('blockquote')),
];

export const insertActions: RibbonAction[] = [
  fromCommand('format.table', 'action.format.table', Table),
  fromCommand('format.image', 'action.format.image', Image),
  fromCommand('format.hyperlink', 'action.format.hyperlink', Link, (editor) => editor.isActive('link')),
  fromCommand('format.codeFences', 'action.format.codeFences', FileCode, (editor) => editor.isActive('codeBlock')),
  {
    id: 'insert.horizontalRule',
    labelKey: 'action.insert.horizontalRule',
    icon: Minus,
    run: (editor) => void editor.chain().focus().setHorizontalRule().run(),
  },
  {
    id: 'insert.footnote',
    labelKey: 'action.insert.footnote',
    icon: Superscript,
    run: (editor) => void editor.chain().focus().insertFootnote().run(),
  },
];

export const diagramActions: RibbonAction[] = [
  { id: 'insert.mermaid', labelKey: 'action.insert.mermaid', icon: Workflow, run: (editor) => insertDiagram(editor, 'mermaid') },
  { id: 'insert.plantuml', labelKey: 'action.insert.plantuml', icon: Waypoints, run: (editor) => insertDiagram(editor, 'plantuml') },
];

// PDF는 브라우저/웹뷰 인쇄 기능을 그대로 쓰고, Word는 문서 트리를 직접 .docx로 변환한다(둘 다
// src/export/). 단축키가 없는 단발성 동작이라 레지스트리 커맨드로 만들지 않는다(insert.* 그룹과 동일한 방식).
export const exportActions: RibbonAction[] = [
  { id: 'export.pdf', labelKey: 'action.export.pdf', icon: FileOutput, run: (editor) => exportPdf(editor) },
  { id: 'export.docx', labelKey: 'action.export.docx', icon: FileType2, run: (editor) => void exportDocx(editor) },
];

// 보기 그룹의 토글 상태는 에디터가 아니라 viewState가 소유한다.
export const viewActions: RibbonAction[] = [
  { ...fromCommand('view.toggleSidebar', 'action.view.toggleSidebar', ListTree), isActive: () => getViewState().sidebar },
  { ...fromCommand('view.sourceMode', 'action.view.sourceMode', FileCode), isActive: () => getViewState().sourceMode },
  { ...fromCommand('view.focusMode', 'action.view.focusMode', Focus), isActive: () => getViewState().focusMode },
  { ...fromCommand('view.typewriterMode', 'action.view.typewriterMode', Type), isActive: () => getViewState().typewriterMode },
];

export const STYLE_OPTIONS = [
  { value: 'p', level: 0, command: 'format.paragraph' },
  { value: '1', level: 1, command: 'format.heading1' },
  { value: '2', level: 2, command: 'format.heading2' },
  { value: '3', level: 3, command: 'format.heading3' },
  { value: '4', level: 4, command: 'format.heading4' },
  { value: '5', level: 5, command: 'format.heading5' },
  { value: '6', level: 6, command: 'format.heading6' },
] as const satisfies readonly { value: string; level: number; command: CommandId }[];

// level 0은 본문, 1~6은 제목 N.
export function styleOptionLabel(option: { level: number }): string {
  return option.level === 0 ? t('style.body') : t('style.heading', { n: option.level });
}

export function activeStyleValue(editor: Editor): string {
  for (let level = 1; level <= 6; level += 1) {
    if (editor.isActive('heading', { level })) return String(level);
  }
  return 'p';
}
