import { useEffect, useMemo, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { loadKeymap } from '../commands/keymap';
import { buildMenuModel, type MenuEntry } from './menuModel';

interface MenuListProps {
  entries: MenuEntry[];
  editor: Editor | null;
  onDone: () => void;
  nested?: boolean;
}

function MenuList({ entries, editor, onDone, nested }: MenuListProps) {
  const position = nested ? 'left-full top-0' : 'left-0 top-full';
  return (
    <div
      role="menu"
      className={`absolute ${position} z-50 min-w-52 rounded-md border border-chrome-border bg-white py-1 shadow-lg`}
    >
      {entries.map((entry, index) => {
        if (entry.kind === 'separator') return <hr key={`sep-${index}`} className="my-1 border-chrome-border" />;

        if (entry.kind === 'submenu') {
          return (
            <div key={entry.text} className="group relative">
              <div role="menuitem" aria-haspopup="menu" className="flex justify-between px-3 py-1.5 group-hover:bg-chrome-hover">
                <span>{entry.text}</span>
                <span aria-hidden>›</span>
              </div>
              <div className="hidden group-hover:block">
                <MenuList entries={entry.entries} editor={editor} onDone={onDone} nested />
              </div>
            </div>
          );
        }

        return (
          <button
            key={entry.id}
            type="button"
            role="menuitem"
            disabled={!editor}
            // 메뉴를 눌러도 에디터의 선택 영역이 사라지지 않도록 포커스 이동을 막는다.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => {
              onDone();
              if (editor) entry.run(editor);
            }}
            className="flex w-full items-center justify-between gap-8 px-3 py-1.5 text-left hover:bg-chrome-hover disabled:opacity-40"
          >
            <span>{entry.text}</span>
            {entry.shortcut && <span className="text-[12px] text-ink-muted">{entry.shortcut}</span>}
          </button>
        );
      })}
    </div>
  );
}

// Windows/Linux 데스크탑용 앱 안 메뉴 바. OS가 그리는 네이티브 메뉴 바는 색을 바꿀 수 없어
// (Windows 11에서 흰색 고정) 툴바와 같은 chrome 색으로 직접 그린다.
export function MenuBar({ editor }: { editor: Editor | null }) {
  const [open, setOpen] = useState<number | null>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const groups = useMemo(() => buildMenuModel(loadKeymap()), []);

  useEffect(() => {
    if (open === null) return;
    const onMouseDown = (event: MouseEvent) => {
      if (!barRef.current?.contains(event.target as Node)) setOpen(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(null);
    };
    document.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={barRef}
      role="menubar"
      aria-label="메뉴"
      className="flex h-7 shrink-0 select-none items-center bg-chrome px-1 text-[13px] text-ink"
    >
      {groups.map((group, index) => (
        <div key={group.text} className="relative">
          <button
            type="button"
            role="menuitem"
            aria-haspopup="menu"
            aria-expanded={open === index}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setOpen(open === index ? null : index)}
            // 메뉴가 하나라도 열려 있으면 다른 메뉴 위로 마우스를 옮기는 것만으로 전환된다(OS 메뉴 바와 동일).
            onMouseEnter={() => open !== null && setOpen(index)}
            className={`rounded px-2.5 py-0.5 hover:bg-chrome-hover ${open === index ? 'bg-chrome-hover' : ''}`}
          >
            {group.text}
          </button>
          {open === index && <MenuList entries={group.entries} editor={editor} onDone={() => setOpen(null)} />}
        </div>
      ))}
    </div>
  );
}
