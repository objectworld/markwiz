import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export const CURRENT_BLOCK_CLASS = 'markwiz-current-block';

// 커서가 놓인 최상위 블록에 클래스를 붙인다. 포커스 모드는 이 클래스가 없는
// 블록을 CSS로 흐리게 처리할 뿐이라, 모드가 꺼져 있어도 비용이 거의 없다.
export const CurrentBlock = Extension.create({
  name: 'currentBlock',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('markwiz-current-block'),
        props: {
          decorations(state) {
            const { $from } = state.selection;
            if ($from.depth < 1) return null;
            const from = $from.before(1);
            const node = state.doc.nodeAt(from);
            if (!node) return null;
            return DecorationSet.create(state.doc, [
              Decoration.node(from, from + node.nodeSize, { class: CURRENT_BLOCK_CLASS }),
            ]);
          },
        },
      }),
    ];
  },
});
