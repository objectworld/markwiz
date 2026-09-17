import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import { editorExtensions } from './index';

let editor: Editor | null = null;

function createEditor(html: string) {
  editor = new Editor({ extensions: editorExtensions, content: html });
  return editor;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('FocusLineDecoration', () => {
  it('shows the heading prefix only while the selection is inside that heading', () => {
    const e = createEditor('<h2>Title</h2><p>Body text</p>');

    e.commands.setTextSelection(2);
    expect(e.view.dom.innerHTML).toContain('## ');

    const bodyPos = e.state.doc.content.size - 2;
    e.commands.setTextSelection(bodyPos);
    expect(e.view.dom.innerHTML).not.toContain('## ');
  });

  it('reveals bold delimiters only while the selection overlaps the bold run', () => {
    const e = createEditor('<p>plain <strong>bold text</strong> tail</p>');

    let boldFrom = -1;
    e.state.doc.descendants((node, pos) => {
      if (boldFrom === -1 && node.isText && node.marks.some((m) => m.type.name === 'bold')) {
        boldFrom = pos;
      }
    });
    expect(boldFrom).toBeGreaterThan(-1);

    e.commands.setTextSelection(boldFrom + 1);
    expect(e.view.dom.innerHTML).toContain('**');

    e.commands.setTextSelection(1);
    expect(e.view.dom.innerHTML).not.toContain('**');
  });

  it('shows "> " only on the blockquote line containing the selection', () => {
    const e = createEditor('<blockquote><p>Quoted</p></blockquote><p>Outside</p>');

    e.commands.setTextSelection(2);
    expect(e.view.dom.innerHTML).toContain('&gt; ');

    const outsidePos = e.state.doc.content.size - 2;
    e.commands.setTextSelection(outsidePos);
    expect(e.view.dom.innerHTML).not.toContain('&gt; ');
  });

  it('shows the correct marker for bullet and ordered list items', () => {
    const e = createEditor('<ul><li><p>Bullet</p></li></ul><ol><li><p>First</p></li></ol>');

    e.commands.setTextSelection(3);
    expect(e.view.dom.innerHTML).toContain('- ');

    let orderedTextPos = -1;
    e.state.doc.descendants((node, pos) => {
      if (orderedTextPos === -1 && node.isText && node.text === 'First') orderedTextPos = pos;
    });
    expect(orderedTextPos).toBeGreaterThan(-1);

    e.commands.setTextSelection(orderedTextPos + 1);
    expect(e.view.dom.innerHTML).toContain('1. ');
  });

  it('shows the checkbox marker for a task item based on its checked state', () => {
    const e = createEditor(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>Done</p></li></ul>',
    );

    e.commands.setTextSelection(2);
    expect(e.view.dom.innerHTML).toContain('- [x] ');
  });

  it('converts "[ ] " into an unchecked task item while typing', () => {
    const e = createEditor('<p></p>');
    e.commands.focus('end');
    e.commands.insertContentAt(e.state.selection.from, '[ ]');
    const spaceHandled = e.view.someProp('handleTextInput', (fn) =>
      fn(e.view, e.state.selection.from, e.state.selection.from, ' ', () => e.state.tr),
    );
    expect(spaceHandled).toBe(true);

    let taskItem: { checked: boolean } | null = null;
    e.state.doc.descendants((node) => {
      if (node.type.name === 'taskItem') taskItem = node.attrs as { checked: boolean };
    });
    expect(taskItem).not.toBeNull();
    expect(taskItem!.checked).toBe(false);
  });
});
