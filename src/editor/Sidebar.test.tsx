import { Editor } from '@tiptap/core';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getViewState,
  resetViewState,
  setViewState,
  SIDEBAR_DEFAULT_WIDTH,
  SIDEBAR_MAX_WIDTH,
  SIDEBAR_MIN_WIDTH,
} from '../commands/viewState';
import { editorExtensions } from './extensions';
import { Sidebar } from './Sidebar';

let editor: Editor;

beforeEach(() => {
  localStorage.clear();
  resetViewState();
  setViewState({ sidebarWidth: SIDEBAR_DEFAULT_WIDTH });
  window.innerWidth = 1400;
  editor = new Editor({ extensions: editorExtensions, content: '<h1>Title</h1><p>x</p>' });
});

afterEach(() => editor.destroy());

const handle = () => screen.getByRole('separator');
const aside = () => screen.getByLabelText('사이드바');

describe('Sidebar resizing', () => {
  it('starts at the default width', () => {
    render(<Sidebar editor={editor} />);
    expect(aside().style.width).toBe(`${SIDEBAR_DEFAULT_WIDTH}px`);
    expect(handle()).toHaveAttribute('aria-valuenow', String(SIDEBAR_DEFAULT_WIDTH));
  });

  it('resizes with the arrow keys (Shift for bigger steps) and remembers the width', () => {
    render(<Sidebar editor={editor} />);
    fireEvent.keyDown(handle(), { key: 'ArrowRight' });
    expect(getViewState().sidebarWidth).toBe(SIDEBAR_DEFAULT_WIDTH + 16);
    fireEvent.keyDown(handle(), { key: 'ArrowLeft', shiftKey: true });
    expect(getViewState().sidebarWidth).toBe(SIDEBAR_DEFAULT_WIDTH + 16 - 64);
    expect(localStorage.getItem('markwiz:sidebar-width')).toBe(String(SIDEBAR_DEFAULT_WIDTH + 16 - 64));
  });

  it('stays within the minimum and maximum', () => {
    render(<Sidebar editor={editor} />);
    fireEvent.keyDown(handle(), { key: 'Home' });
    expect(getViewState().sidebarWidth).toBe(SIDEBAR_MIN_WIDTH);
    fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
    expect(getViewState().sidebarWidth).toBe(SIDEBAR_MIN_WIDTH);
    fireEvent.keyDown(handle(), { key: 'End' });
    expect(getViewState().sidebarWidth).toBe(SIDEBAR_MAX_WIDTH);
  });

  it('never grows so wide that the document area disappears in a narrow window', () => {
    window.innerWidth = 700;
    render(<Sidebar editor={editor} />);
    fireEvent.keyDown(handle(), { key: 'End' });
    expect(getViewState().sidebarWidth).toBe(500);
  });

  it('resets to the default width on double-click', () => {
    render(<Sidebar editor={editor} />);
    fireEvent.keyDown(handle(), { key: 'End' });
    fireEvent.doubleClick(handle());
    expect(getViewState().sidebarWidth).toBe(SIDEBAR_DEFAULT_WIDTH);
    expect(localStorage.getItem('markwiz:sidebar-width')).toBe(String(SIDEBAR_DEFAULT_WIDTH));
  });
});
