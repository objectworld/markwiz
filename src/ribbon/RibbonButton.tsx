import type { Editor } from '@tiptap/core';
import { getShortcutForPlatform, loadKeymap } from '../commands/keymap';
import type { RibbonAction } from './ribbonActions';

interface RibbonButtonProps {
  action: RibbonAction;
  editor: Editor | null;
  active: boolean;
  disabled: boolean;
}

function tooltip(action: RibbonAction): string {
  const entry = action.commandId ? loadKeymap()[action.commandId] : undefined;
  return entry ? `${action.label} (${getShortcutForPlatform(entry)})` : action.label;
}

export function RibbonButton({ action, editor, active, disabled }: RibbonButtonProps) {
  const Icon = action.icon;
  const base = 'flex h-8 w-8 items-center justify-center rounded border text-ink transition-colors';
  const state = active ? 'border-accent/40 bg-accent/15 text-accent' : 'border-transparent hover:bg-chrome-hover';

  return (
    <button
      type="button"
      title={tooltip(action)}
      aria-label={action.label}
      aria-pressed={action.isActive ? active : undefined}
      disabled={disabled || !editor}
      // 버튼을 눌러도 에디터의 선택 영역이 사라지지 않도록 포커스 이동을 막는다.
      onMouseDown={(event) => event.preventDefault()}
      onClick={() => editor && action.run(editor)}
      className={`${base} ${state} disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent`}
    >
      <Icon size={18} strokeWidth={1.75} />
    </button>
  );
}
