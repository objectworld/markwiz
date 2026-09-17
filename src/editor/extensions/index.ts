import StarterKit from '@tiptap/starter-kit';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import TaskList from '@tiptap/extension-task-list';
import Image from '@tiptap/extension-image';
import { TableKit } from '@tiptap/extension-table';
import { TaskItem } from './taskItem';
import { FootnoteReference, FootnoteDefinition } from './footnote';
import { FocusLineDecoration } from './focusLineDecoration';
import { lowlight } from './lowlight';

export const editorExtensions = [
  StarterKit.configure({
    heading: { levels: [1, 2, 3, 4, 5, 6] },
    codeBlock: false,
    link: { markdownLinks: true },
  }),
  CodeBlockLowlight.configure({ lowlight }),
  TaskList,
  TaskItem,
  Image,
  TableKit,
  FootnoteReference,
  FootnoteDefinition,
  FocusLineDecoration,
];
