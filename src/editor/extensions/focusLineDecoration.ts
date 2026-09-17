import { Extension, getMarksBetween } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type Selection } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

// Typora처럼 "커서가 위치한 블록/마크에서만 원본 마크다운 문자를 노출"하는 동작.
// Tiptap 문서 모델에는 실제 raw 문자가 남아있지 않으므로(입력 규칙이 이미 서식으로
// 치환함), 선택 영역과 겹치는 블록/마크에 한해 위젯 데코레이션으로 구분자를
// "다시 그려 보여주는" 방식으로 구현한다.

const pluginKey = new PluginKey('markwiz-focus-line-decoration');

const MARK_DELIMITERS: Record<string, [string, string]> = {
  bold: ['**', '**'],
  italic: ['_', '_'],
  strike: ['~~', '~~'],
  code: ['`', '`'],
};

function rawMarker(text: string, extraClass = ''): () => HTMLElement {
  return () => {
    const span = document.createElement('span');
    span.className = `markwiz-raw-marker ${extraClass}`.trim();
    span.textContent = text;
    span.contentEditable = 'false';
    return span;
  };
}

function orderedListMarker(parent: ProseMirrorNode, index: number): string {
  const start = typeof parent.attrs.start === 'number' ? parent.attrs.start : 1;
  return `${start + index}. `;
}

function buildDecorations(doc: ProseMirrorNode, selection: Selection): DecorationSet {
  const decorations: Decoration[] = [];
  const { from, to } = selection;

  const seenMarkRanges = new Set<string>();
  for (const { mark, from: mFrom, to: mTo } of getMarksBetween(from, to, doc)) {
    const delimiters = MARK_DELIMITERS[mark.type.name];
    const isLink = mark.type.name === 'link';
    if (!delimiters && !isLink) continue;

    const key = `${mark.type.name}:${mFrom}:${mTo}`;
    if (seenMarkRanges.has(key)) continue;
    seenMarkRanges.add(key);

    const [open, close] = isLink ? ['[', `](${mark.attrs.href ?? ''})`] : delimiters;
    decorations.push(Decoration.widget(mFrom, rawMarker(open), { side: -1, key: `${key}-open` }));
    decorations.push(Decoration.widget(mTo, rawMarker(close), { side: 1, key: `${key}-close` }));
  }

  doc.nodesBetween(from, to, (node, pos, parent, index) => {
    const parentName = parent?.type.name;

    if (node.type.name === 'heading') {
      const prefix = `${'#'.repeat(node.attrs.level as number)} `;
      decorations.push(Decoration.widget(pos + 1, rawMarker(prefix), { side: -1, key: `heading-${pos}` }));
      return;
    }

    if (node.type.name === 'codeBlock') {
      const lang = typeof node.attrs.language === 'string' ? node.attrs.language : '';
      decorations.push(
        Decoration.widget(pos + 1, rawMarker(`\`\`\`${lang}`, 'markwiz-raw-fence'), {
          side: -1,
          key: `code-open-${pos}`,
        }),
      );
      decorations.push(
        Decoration.widget(pos + node.nodeSize - 1, rawMarker('```', 'markwiz-raw-fence'), {
          side: 1,
          key: `code-close-${pos}`,
        }),
      );
      return;
    }

    if (node.type.name === 'paragraph' && parentName === 'blockquote') {
      decorations.push(Decoration.widget(pos + 1, rawMarker('> '), { side: -1, key: `bq-${pos}` }));
      return;
    }

    if (node.type.name === 'taskItem') {
      const checked = Boolean(node.attrs.checked);
      decorations.push(
        Decoration.widget(pos + 1, rawMarker(`- [${checked ? 'x' : ' '}] `), { side: -1, key: `task-${pos}` }),
      );
      return;
    }

    if (node.type.name === 'listItem' && parentName) {
      const marker = parentName === 'orderedList' ? orderedListMarker(parent!, index) : '- ';
      decorations.push(Decoration.widget(pos + 1, rawMarker(marker), { side: -1, key: `li-${pos}` }));
    }
  });

  return DecorationSet.create(doc, decorations);
}

export const FocusLineDecoration = Extension.create({
  name: 'focusLineDecoration',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: pluginKey,
        props: {
          decorations(state) {
            return buildDecorations(state.doc, state.selection);
          },
        },
      }),
    ];
  },
});
