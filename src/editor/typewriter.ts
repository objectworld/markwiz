import type { Editor } from '@tiptap/core';

// 캐럿 줄의 중앙이 스크롤 컨테이너의 세로 중앙에 오도록 스크롤해야 하는 양(px).
export function typewriterScrollDelta(
  caretTop: number,
  caretBottom: number,
  containerTop: number,
  containerHeight: number,
): number {
  return (caretTop + caretBottom) / 2 - (containerTop + containerHeight / 2);
}

export function scrollCaretToCenter(editor: Editor, container: HTMLElement): void {
  try {
    const caret = editor.view.coordsAtPos(editor.state.selection.head);
    const rect = container.getBoundingClientRect();
    const delta = typewriterScrollDelta(caret.top, caret.bottom, rect.top, rect.height);
    if (Math.abs(delta) > 1) container.scrollBy({ top: delta });
  } catch {
    // 뷰가 아직 마운트되지 않았거나(jsdom 등) 좌표를 구할 수 없으면 조용히 건너뛴다.
  }
}
