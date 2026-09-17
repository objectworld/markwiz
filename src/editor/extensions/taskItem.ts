import TiptapTaskItem from '@tiptap/extension-task-item';
import { InputRule } from '@tiptap/core';
import { findWrapping } from '@tiptap/pm/transform';

// TaskItem은 공식 입력 규칙이 없어 "- [ ] "/"- [x] " 타이핑 시 체크박스로
// 즉시 변환되도록 직접 구현한다 (findWrapping이 taskList 상위 래퍼까지 자동 계산).
const taskItemInputRegex = /^\s*\[([ xX]?)]\s$/;

export const TaskItem = TiptapTaskItem.extend({
  addInputRules() {
    return [
      new InputRule({
        find: taskItemInputRegex,
        handler: ({ state, range, match }) => {
          const checked = /^[xX]$/.test(match[1]);
          const { tr } = state;
          tr.delete(range.from, range.to);

          const $start = tr.doc.resolve(range.from);
          const blockRange = $start.blockRange();
          const wrapping = blockRange && findWrapping(blockRange, this.type, { checked });
          if (!blockRange || !wrapping) {
            return;
          }
          tr.wrap(blockRange, wrapping);
        },
      }),
    ];
  },
});
