import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Editor } from '@tiptap/core';
import { CellSelection } from '@tiptap/pm/tables';
import { TextSelection } from '@tiptap/pm/state';
import type { MessageKey } from '../i18n/messages';
import { t, useLanguage } from '../i18n/i18n';

interface MenuItem {
  id: string;
  labelKey: MessageKey;
  run: (editor: Editor) => boolean;
  can: (editor: Editor) => boolean;
  // 항목이 꺼져 있을 때 이유를 알려 주는 툴팁
  hintKey?: MessageKey;
}

const ITEMS: (MenuItem | 'separator')[] = [
  { id: 'addRowBefore', labelKey: 'table.addRowBefore', run: (e) => e.chain().focus().addRowBefore().run(), can: (e) => e.can().addRowBefore() },
  { id: 'addRowAfter', labelKey: 'table.addRowAfter', run: (e) => e.chain().focus().addRowAfter().run(), can: (e) => e.can().addRowAfter() },
  { id: 'deleteRow', labelKey: 'table.deleteRow', run: (e) => e.chain().focus().deleteRow().run(), can: (e) => e.can().deleteRow() },
  'separator',
  { id: 'addColumnBefore', labelKey: 'table.addColumnBefore', run: (e) => e.chain().focus().addColumnBefore().run(), can: (e) => e.can().addColumnBefore() },
  { id: 'addColumnAfter', labelKey: 'table.addColumnAfter', run: (e) => e.chain().focus().addColumnAfter().run(), can: (e) => e.can().addColumnAfter() },
  { id: 'deleteColumn', labelKey: 'table.deleteColumn', run: (e) => e.chain().focus().deleteColumn().run(), can: (e) => e.can().deleteColumn() },
  'separator',
  { id: 'mergeCells', labelKey: 'table.mergeCells', hintKey: 'table.mergeHint', run: (e) => e.chain().focus().mergeCells().run(), can: (e) => e.can().mergeCells() },
  { id: 'splitCell', labelKey: 'table.splitCell', hintKey: 'table.splitHint', run: (e) => e.chain().focus().splitCell().run(), can: (e) => e.can().splitCell() },
  'separator',
  { id: 'deleteTable', labelKey: 'table.deleteTable', run: (e) => e.chain().focus().deleteTable().run(), can: (e) => e.can().deleteTable() },
];

// 오른쪽 버튼을 누른 셀이 이미 선택된 여러 셀(셀 병합 대상) 중 하나면 선택을 그대로 두고,
// 아니면 그 셀 안으로 커서를 옮긴다 — 그래야 명령이 "방금 클릭한 셀"에 적용된다.
export function selectCellForMenu(editor: Editor, cell: Element): void {
  const { state, view } = editor;
  const cellPos = view.posAtDOM(cell, 0) - 1;
  const selection = state.selection;
  if (selection instanceof CellSelection) {
    let inside = false;
    selection.forEachCell((_node, pos) => {
      if (pos === cellPos) inside = true;
    });
    if (inside) return;
  }
  view.dispatch(state.tr.setSelection(TextSelection.near(state.doc.resolve(cellPos + 1))));
}

interface TableContextMenuProps {
  editor: Editor;
  x: number;
  y: number;
  onClose: () => void;
}

// 표 안에서 오른쪽 버튼을 눌렀을 때 뜨는 메뉴: 행/열 삽입·삭제, 셀 병합/분할, 표 삭제.
export function TableContextMenu({ editor, x, y, onClose }: TableContextMenuProps) {
  useLanguage();
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: x, top: y });

  // 화면 밖으로 넘치지 않게 메뉴 크기를 재서 위치를 당겨 놓는다.
  useLayoutEffect(() => {
    const menu = ref.current;
    if (!menu) return;
    const { width, height } = menu.getBoundingClientRect();
    setPosition({
      left: Math.max(4, Math.min(x, window.innerWidth - width - 4)),
      top: Math.max(4, Math.min(y, window.innerHeight - height - 4)),
    });
  }, [x, y]);

  useEffect(() => {
    const onMouseDown = (event: MouseEvent) => {
      if (!ref.current?.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onMouseDown, true);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('blur', onClose);
    window.addEventListener('resize', onClose);
    // 문서가 스크롤되면 메뉴가 엉뚱한 곳에 떠 있게 되므로 닫는다.
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('blur', onClose);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);

  return createPortal(
    <div
      ref={ref}
      role="menu"
      aria-label={t('table.menuAria')}
      style={position}
      className="fixed z-50 min-w-48 rounded-md border border-chrome-border bg-white py-1 text-[13px] text-ink shadow-lg"
      onContextMenu={(event) => event.preventDefault()}
    >
      {ITEMS.map((item, index) => {
        if (item === 'separator') return <hr key={`sep-${index}`} className="my-1 border-chrome-border" />;
        const enabled = item.can(editor);
        return (
          <button
            key={item.id}
            type="button"
            role="menuitem"
            disabled={!enabled}
            title={!enabled && item.hintKey ? t(item.hintKey) : undefined}
            // 메뉴를 눌러도 에디터의 선택 영역(여러 셀 선택 포함)이 사라지지 않도록 포커스 이동을 막는다.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onClose();
              item.run(editor);
            }}
            className="block w-full px-3 py-1.5 text-left hover:bg-chrome-hover disabled:opacity-40 disabled:hover:bg-transparent"
          >
            {t(item.labelKey)}
          </button>
        );
      })}
    </div>,
    document.body,
  );
}

// 셀 DOM 요소를 찾는다. 키보드의 컨텍스트 메뉴 키(Shift+F10)는 이벤트 대상이 셀이 아니라 에디터 루트 자체일 수 있어서,
// 그때만 커서가 놓인 위치에서 찾는다(표 밖의 문단을 클릭했을 때까지 표 메뉴가 뜨면 안 된다).
export function findCellElement(editor: Editor, target: EventTarget | null): Element | null {
  const fromTarget = target instanceof Element ? target.closest('td, th') : null;
  if (fromTarget && editor.view.dom.contains(fromTarget)) return fromTarget;
  if (target !== editor.view.dom || !editor.isActive('table')) return null;
  const { node } = editor.view.domAtPos(editor.state.selection.from);
  const element = node instanceof Element ? node : node.parentElement;
  return element?.closest('td, th') ?? null;
}
