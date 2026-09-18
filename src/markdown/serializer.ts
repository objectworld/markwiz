import { MarkdownSerializer, type MarkdownSerializerState } from 'prosemirror-markdown';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { alignToGfm, backticksFor, escapeTableCell } from './schema-map';

function serializeCell(node: ProseMirrorNode): string {
  return markdownSerializer.serialize(node, { tightLists: true }).trim();
}

export const markdownSerializer: MarkdownSerializer = new MarkdownSerializer(
  {
    doc(state, node) {
      state.renderContent(node);
    },
    paragraph(state, node) {
      state.renderInline(node);
      state.closeBlock(node);
    },
    heading(state, node) {
      state.write(`${state.repeat('#', node.attrs.level as number)} `);
      state.renderInline(node, false);
      state.closeBlock(node);
    },
    blockquote(state, node) {
      state.wrapBlock('> ', null, node, () => state.renderContent(node));
    },
    bulletList(state, node) {
      state.renderList(node, '  ', () => '- ');
    },
    orderedList(state, node) {
      const start = typeof node.attrs.start === 'number' ? node.attrs.start : 1;
      const maxWidth = String(start + node.childCount - 1).length;
      const space = state.repeat(' ', maxWidth + 2);
      state.renderList(node, space, (i) => {
        const numberString = String(start + i);
        return `${state.repeat(' ', maxWidth - numberString.length)}${numberString}. `;
      });
    },
    listItem(state, node) {
      state.renderContent(node);
    },
    taskList(state, node) {
      state.renderList(node, '  ', () => '- ');
    },
    taskItem(state, node) {
      state.write(`[${node.attrs.checked ? 'x' : ' '}] `);
      state.renderContent(node);
    },
    codeBlock(state, node) {
      const language = typeof node.attrs.language === 'string' ? node.attrs.language : '';
      state.write(`\`\`\`${language}\n`);
      state.text(node.textContent, false);
      state.ensureNewLine();
      state.write('```');
      state.closeBlock(node);
    },
    horizontalRule(state, node) {
      state.write('---');
      state.closeBlock(node);
    },
    hardBreak(state, node, parent, index) {
      for (let i = index + 1; i < parent.childCount; i++) {
        if (parent.child(i).type !== node.type) {
          state.write('\\\n');
          return;
        }
      }
    },
    image(state, node) {
      const alt = state.esc((node.attrs.alt as string) || '');
      const title = node.attrs.title ? ` "${String(node.attrs.title).replace(/"/g, '\\"')}"` : '';
      state.write(`![${alt}](${node.attrs.src}${title})`);
    },
    table(state, node) {
      const rows: string[] = [];
      let separator = '';
      node.forEach((row, _offset, rowIndex) => {
        const cells: string[] = [];
        const aligns: string[] = [];
        row.forEach((cell) => {
          cells.push(escapeTableCell(serializeCell(cell)));
          aligns.push(alignToGfm(cell.attrs.align));
        });
        rows.push(`| ${cells.join(' | ')} |`);
        if (rowIndex === 0) separator = `| ${aligns.join(' | ')} |`;
      });
      const [headerLine, ...bodyLines] = rows;
      state.write([headerLine, separator, ...bodyLines].join('\n'));
      state.closeBlock(node);
    },
    footnoteReference(state, node) {
      state.write(`[^${node.attrs.id}]`);
    },
    footnoteDefinition(state, node) {
      state.write(`[^${node.attrs.id}]: `);
      node.forEach((child, _offset, index) => {
        if (index === 0) {
          state.renderInline(child);
        } else {
          state.ensureNewLine();
          state.write('    ');
          state.render(child, node, index);
        }
      });
      state.closeBlock(node);
    },
    text(state, node) {
      state.text(node.text ?? '', true);
    },
  },
  {
    bold: { open: '**', close: '**', mixable: true, expelEnclosingWhitespace: true },
    italic: { open: '_', close: '_', mixable: true, expelEnclosingWhitespace: true },
    strike: { open: '~~', close: '~~', mixable: true, expelEnclosingWhitespace: true },
    code: {
      open: (_state: MarkdownSerializerState, _mark, parent, index) => backticksFor(parent.child(index), -1),
      close: (_state: MarkdownSerializerState, _mark, parent, index) => backticksFor(parent.child(index - 1), 1),
      escape: false,
    },
    link: {
      open: '[',
      close: (_state, mark) => {
        const href = String(mark.attrs.href).replace(/[()"]/g, '\\$&');
        const title = mark.attrs.title ? ` "${String(mark.attrs.title).replace(/"/g, '\\"')}"` : '';
        return `](${href}${title})`;
      },
      mixable: true,
    },
  },
);

export function serializeToMarkdown(doc: ProseMirrorNode): string {
  return markdownSerializer.serialize(doc, { tightLists: true });
}
