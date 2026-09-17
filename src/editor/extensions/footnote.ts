import { Node, mergeAttributes } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    footnote: {
      insertFootnote: () => ReturnType;
    };
  }
}

function nextFootnoteId(doc: ProseMirrorNode): string {
  let max = 0;
  doc.descendants((node) => {
    if (node.type.name === 'footnoteReference') {
      const n = Number(node.attrs.id);
      if (!Number.isNaN(n)) max = Math.max(max, n);
    }
  });
  return String(max + 1);
}

export const FootnoteReference = Node.create({
  name: 'footnoteReference',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'sup[data-footnote-ref]',
        getAttrs: (el) => ({ id: (el as HTMLElement).getAttribute('data-id') }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'sup',
      mergeAttributes(HTMLAttributes, {
        'data-footnote-ref': '',
        'data-id': node.attrs.id,
        class: 'markwiz-footnote-ref',
      }),
      `[${node.attrs.id}]`,
    ];
  },

  addCommands() {
    return {
      insertFootnote:
        () =>
        ({ tr, dispatch, editor }) => {
          if (!dispatch) return true;

          const id = nextFootnoteId(tr.doc);
          tr.replaceSelectionWith(editor.schema.nodes.footnoteReference.create({ id }));

          const definition = editor.schema.nodes.footnoteDefinition.create(
            { id },
            editor.schema.nodes.paragraph.create(),
          );
          tr.insert(tr.doc.content.size, definition);

          dispatch(tr);
          return true;
        },
    };
  },
});

export const FootnoteDefinition = Node.create({
  name: 'footnoteDefinition',
  group: 'block',
  content: 'block+',

  addAttributes() {
    return {
      id: { default: null },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-footnote-def]',
        getAttrs: (el) => ({ id: (el as HTMLElement).getAttribute('data-id') }),
      },
    ];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-footnote-def': '',
        'data-id': node.attrs.id,
        class: 'markwiz-footnote-def',
      }),
      0,
    ];
  },
});
