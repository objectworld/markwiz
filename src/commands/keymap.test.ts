import { afterEach, describe, expect, it } from 'vitest';
import { COMMAND_IDS } from './commandIds';
import defaultKeymap from './keymap.json';
import { getShortcutForPlatform, loadKeymap, setKeymapOverrides, type KeymapConfig } from './keymap';
import { toProseMirrorShortcut, toTauriAccelerator } from './shortcutFormat';

const keymap = defaultKeymap as KeymapConfig;

describe('keymap.json', () => {
  it('has a Windows/Linux and macOS entry for every registered command id', () => {
    for (const id of COMMAND_IDS) {
      const entry = keymap[id];
      expect(entry, `missing keymap entry for ${id}`).toBeDefined();
      expect(entry.win).toBeTruthy();
      expect(entry.mac).toBeTruthy();
    }
  });

  it('does not derive macOS shortcuts by naively swapping Ctrl for Cmd', () => {
    const outline = keymap['view.outline'];
    expect(outline.win).toBe('Ctrl+Shift+1');
    expect(outline.mac).toBe('Cmd+Control+1');
    expect(outline.win.replace('Ctrl', 'Cmd')).not.toBe(outline.mac);

    const strike = keymap['format.strike'];
    expect(strike.mac).toContain('Control');
    expect(strike.mac).not.toContain('Cmd');
  });
});

describe('toProseMirrorShortcut', () => {
  it('lowercases single-letter keys and joins with "-"', () => {
    expect(toProseMirrorShortcut('Ctrl+B')).toBe('Ctrl-b');
    expect(toProseMirrorShortcut('Cmd+Shift+S')).toBe('Cmd-Shift-s');
  });

  it('preserves named/symbol keys and multi-modifier combos as-is', () => {
    expect(toProseMirrorShortcut('F8')).toBe('F8');
    expect(toProseMirrorShortcut('Cmd+Control+1')).toBe('Cmd-Control-1');
    expect(toProseMirrorShortcut('Ctrl+\\')).toBe('Ctrl-\\');
  });
});

describe('toTauriAccelerator', () => {
  it('uppercases single-letter keys and joins with "+"', () => {
    expect(toTauriAccelerator('Ctrl+b')).toBe('Ctrl+B');
    expect(toTauriAccelerator('Cmd+Shift+s')).toBe('Cmd+Shift+S');
  });

  it('normalizes the "Control" alias and preserves multi-modifier combos', () => {
    expect(toTauriAccelerator('Cmd+Control+1')).toBe('Cmd+Ctrl+1');
    expect(toTauriAccelerator('F8')).toBe('F8');
  });
});

describe('getShortcutForPlatform', () => {
  it('picks the win or mac entry based on the given platform', () => {
    const entry = { win: 'Ctrl+B', mac: 'Cmd+B' };
    expect(getShortcutForPlatform(entry, 'win')).toBe('Ctrl+B');
    expect(getShortcutForPlatform(entry, 'mac')).toBe('Cmd+B');
  });
});

describe('loadKeymap', () => {
  afterEach(() => localStorage.clear());

  it('merges user overrides from localStorage on top of the bundled defaults', () => {
    setKeymapOverrides({ 'format.bold': { win: 'Ctrl+Shift+B', mac: 'Cmd+Shift+B' } });

    const merged = loadKeymap();
    expect(merged['format.bold'].win).toBe('Ctrl+Shift+B');
    expect(merged['format.italic'].win).toBe('Ctrl+I');
  });
});
