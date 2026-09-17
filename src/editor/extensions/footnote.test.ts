import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import { editorExtensions } from './index';

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('footnote', () => {
  it('inserts a reference at the cursor and appends a definition block', () => {
    editor = new Editor({ extensions: editorExtensions, content: '<p>Hello</p>' });
    editor.commands.setTextSelection(6);
    editor.commands.insertFootnote();

    expect(editor.getHTML()).toContain('data-footnote-ref');
    expect(editor.getHTML()).toContain('data-footnote-def');

    let referenceId: string | null = null;
    let definitionId: string | null = null;
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'footnoteReference') referenceId = node.attrs.id;
      if (node.type.name === 'footnoteDefinition') definitionId = node.attrs.id;
    });
    expect(referenceId).not.toBeNull();
    expect(referenceId).toBe(definitionId);
  });

  it('assigns increasing ids for successive footnotes', () => {
    editor = new Editor({ extensions: editorExtensions, content: '<p>Hello</p>' });
    editor.commands.focus('end');
    editor.commands.insertFootnote();
    editor.commands.insertFootnote();

    const ids: string[] = [];
    editor.state.doc.descendants((node) => {
      if (node.type.name === 'footnoteReference') ids.push(node.attrs.id);
    });
    expect(ids).toEqual(['1', '2']);
  });
});
