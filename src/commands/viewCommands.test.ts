import { Editor } from '@tiptap/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { editorExtensions } from '../editor/extensions';
import { matchesShortcut } from './shortcutFormat';
import { executeCommand } from './registry';
import './viewCommands';
import { getMarkdown } from './viewCommands';
import { getViewState, resetViewState, setViewState } from './viewState';

let editor: Editor;

beforeEach(() => {
  resetViewState();
  editor = new Editor({ extensions: editorExtensions, content: '<h1>Title</h1><p>hello</p>' });
});

afterEach(() => editor.destroy());

describe('view commands', () => {
  it('toggleSidebar and outline toggle the sidebar', () => {
    expect(getViewState().sidebar).toBe(true); // 기본값은 열림
    executeCommand('view.toggleSidebar', editor);
    expect(getViewState().sidebar).toBe(false);
    executeCommand('view.outline', editor);
    expect(getViewState().sidebar).toBe(true);
  });

  it('focusMode and typewriterMode toggle independently', () => {
    executeCommand('view.focusMode', editor);
    expect(getViewState()).toMatchObject({ focusMode: true, typewriterMode: false });
    executeCommand('view.typewriterMode', editor);
    expect(getViewState()).toMatchObject({ focusMode: true, typewriterMode: true });
    executeCommand('view.focusMode', editor);
    expect(getViewState().focusMode).toBe(false);
  });

  it('sourceMode shows the markdown and applies edits back on exit', () => {
    executeCommand('view.sourceMode', editor);
    expect(getViewState().sourceMode).toBe(true);
    expect(getViewState().sourceText).toBe('# Title\n\nhello');

    setViewState({ sourceText: '## Changed\n\n**bold** text' });
    expect(getMarkdown(editor)).toBe('## Changed\n\n**bold** text');

    executeCommand('view.sourceMode', editor);
    expect(getViewState().sourceMode).toBe(false);
    expect(editor.getJSON().content?.[0]).toMatchObject({ type: 'heading', attrs: { level: 2 } });
  });

  it('sourceMode leaves the document untouched when the text was not edited', () => {
    const before = editor.state.doc;
    executeCommand('view.sourceMode', editor);
    executeCommand('view.sourceMode', editor);
    expect(editor.state.doc).toBe(before);
  });
});

describe('zoom commands', () => {
  it('zoomIn/zoomOut move in 10% steps and actualSize resets to 100%', () => {
    expect(getViewState().zoom).toBe(1);
    executeCommand('view.zoomIn', editor);
    executeCommand('view.zoomIn', editor);
    expect(getViewState().zoom).toBe(1.2);
    executeCommand('view.zoomOut', editor);
    expect(getViewState().zoom).toBe(1.1);
    executeCommand('view.actualSize', editor);
    expect(getViewState().zoom).toBe(1);
  });

  it('snaps to the next 10% mark when the zoom is between marks (wheel/pinch)', () => {
    setViewState({ zoom: 1.04 });
    executeCommand('view.zoomIn', editor);
    expect(getViewState().zoom).toBe(1.1);
    setViewState({ zoom: 1.04 });
    executeCommand('view.zoomOut', editor);
    expect(getViewState().zoom).toBe(1);
  });

  it('stays within 50%..300%', () => {
    for (let i = 0; i < 40; i += 1) executeCommand('view.zoomOut', editor);
    expect(getViewState().zoom).toBe(0.5);
    for (let i = 0; i < 60; i += 1) executeCommand('view.zoomIn', editor);
    expect(getViewState().zoom).toBe(3);
  });
});

describe('matchesShortcut', () => {
  const event = (init: Partial<KeyboardEvent>) =>
    ({ key: '', code: '', ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, ...init }) as KeyboardEvent;

  it('matches Shift+= / Shift+- by physical key even though event.key becomes + / _', () => {
    expect(matchesShortcut(event({ key: '+', code: 'Equal', ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+=')).toBe(true);
    expect(matchesShortcut(event({ key: '_', code: 'Minus', ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+-')).toBe(true);
    expect(matchesShortcut(event({ key: '-', code: 'Minus', ctrlKey: true }), 'Ctrl+Shift+-')).toBe(false);
  });

  it('matches modifier combos and requires exact modifiers', () => {
    expect(matchesShortcut(event({ key: '/', ctrlKey: true }), 'Ctrl+/')).toBe(true);
    expect(matchesShortcut(event({ key: '/', ctrlKey: true, shiftKey: true }), 'Ctrl+/')).toBe(false);
    expect(matchesShortcut(event({ key: 'L', ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+L')).toBe(true);
  });

  it('matches function keys and shifted digits by physical key', () => {
    expect(matchesShortcut(event({ key: 'F8' }), 'F8')).toBe(true);
    expect(matchesShortcut(event({ key: '!', code: 'Digit1', ctrlKey: true, shiftKey: true }), 'Ctrl+Shift+1')).toBe(true);
    expect(matchesShortcut(event({ key: '1', code: 'Digit1', metaKey: true, ctrlKey: true }), 'Cmd+Control+1')).toBe(true);
  });
});
