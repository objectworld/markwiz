import StarterKit from '@tiptap/starter-kit';
import Bold from '@tiptap/extension-bold';
import Italic from '@tiptap/extension-italic';
import Strike from '@tiptap/extension-strike';
import Code from '@tiptap/extension-code';
import Heading from '@tiptap/extension-heading';
import Blockquote from '@tiptap/extension-blockquote';
import { BulletList, OrderedList } from '@tiptap/extension-list';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { ReactNodeViewRenderer } from '@tiptap/react';
import TaskList from '@tiptap/extension-task-list';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { TaskItem } from './taskItem';
import { FootnoteReference, FootnoteDefinition } from './footnote';
import { FocusLineDecoration } from './focusLineDecoration';
import { CommandKeymap } from './commandKeymap';
import { lowlight } from './lowlight';
import { CodeBlockView } from '../nodeviews/CodeBlockView';

// registry.ts + keymap.json이 단축키의 유일한 소스가 되도록, 아래 노드/마크들이
// 라이브러리 기본으로 갖고 있는 addKeyboardShortcuts()를 모두 비워서
// CommandKeymap 확장 하나만 실제 키 바인딩을 담당하게 한다. 이렇게 하지 않으면
// keymap.json을 수정해도 라이브러리 내장 단축키가 그대로 남아 재매핑이
// 반영되지 않는다.
const noOwnShortcuts = { addKeyboardShortcuts: () => ({}) };

export const editorExtensions = [
  StarterKit.configure({
    heading: false,
    codeBlock: false,
    bold: false,
    italic: false,
    strike: false,
    code: false,
    blockquote: false,
    bulletList: false,
    orderedList: false,
    link: { markdownLinks: true },
  }),
  Heading.extend(noOwnShortcuts).configure({ levels: [1, 2, 3, 4, 5, 6] }),
  Bold.extend(noOwnShortcuts),
  Italic.extend(noOwnShortcuts),
  Strike.extend(noOwnShortcuts),
  Code.extend(noOwnShortcuts),
  Blockquote.extend(noOwnShortcuts),
  BulletList.extend(noOwnShortcuts),
  OrderedList.extend(noOwnShortcuts),
  CodeBlockLowlight.extend(noOwnShortcuts)
    .extend({ addNodeView: () => ReactNodeViewRenderer(CodeBlockView) })
    .configure({ lowlight }),
  TaskList,
  TaskItem,
  // Tiptap Image는 기본이 block 레벨 노드라 문단 안에 들어갈 수 없다.
  // 마크다운의 `텍스트 ![alt](src) 텍스트`처럼 인라인으로 쓰기 위해 명시적으로 켠다.
  Image.configure({ inline: true }),
  TableKit,
  FootnoteReference,
  FootnoteDefinition,
  FocusLineDecoration,
  CommandKeymap,
];
