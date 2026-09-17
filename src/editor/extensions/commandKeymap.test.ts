import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import { editorExtensions } from './index';

let editor: Editor | null = null;

afterEach(() => {
  editor?.destroy();
  editor = null;
});

function press(editor: Editor, init: KeyboardEventInit): boolean {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init });
  return Boolean(editor.view.someProp('handleKeyDown', (fn) => fn(editor.view, event)));
}

describe('CommandKeymap', () => {
  it('triggers format.bold through the registry on Ctrl+B', () => {
    editor = new Editor({ extensions: editorExtensions, content: '<p>hello</p>' });
    editor.commands.selectAll();

    const handled = press(editor, { key: 'b', ctrlKey: true });

    expect(handled).toBe(true);
    expect(editor.isActive('bold')).toBe(true);
  });

  it('triggers format.heading2 through the registry on Ctrl+2', () => {
    editor = new Editor({ extensions: editorExtensions, content: '<p>hello</p>' });
    editor.commands.setTextSelection(1);

    const handled = press(editor, { key: '2', ctrlKey: true });

    expect(handled).toBe(true);
    expect(editor.isActive('heading', { level: 2 })).toBe(true);
  });

  it("leaves an unimplemented command's shortcut unhandled instead of throwing", () => {
    editor = new Editor({ extensions: editorExtensions, content: '<p>hello</p>' });

    // view.focusMode (F8) has no registered handler yet (no view built for it).
    expect(() => press(editor!, { key: 'F8' })).not.toThrow();
  });
});
