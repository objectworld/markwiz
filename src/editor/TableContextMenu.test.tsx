import type { Editor } from '@tiptap/core';
import { CellSelection } from '@tiptap/pm/tables';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { openTab, resetTabsState, type DocumentTab } from '../commands/tabsState';
import { DocumentPane } from './DocumentPane';
import { serializeToMarkdown } from '../markdown/serializer';

const TABLE = '| A | B |\n| --- | --- |\n| 1 | 2 |\n| 3 | 4 |';

beforeEach(() => {
  resetTabsState();
});

async function setup(markdown = TABLE) {
  const id = openTab({ path: '/docs/t.md', name: 't.md', content: { kind: 'markdown', markdown } });
  const tab: DocumentTab = { id, path: '/docs/t.md', name: 't.md', dirty: false };
  let editor: Editor | null = null;
  render(<DocumentPane tab={tab} isActive onEditorReady={(_id, instance) => (editor = instance)} />);
  await waitFor(() => expect(editor?.getText()).toContain('A'));
  return editor as unknown as Editor;
}

const rowCount = (editor: Editor) => editor.state.doc.firstChild!.childCount;
const colCount = (editor: Editor) => editor.state.doc.firstChild!.firstChild!.childCount;
const cell = (text: string) => screen.getByText(text).closest('td, th') as HTMLElement;

describe('table context menu', () => {
  it('opens on right-click in a cell with row/column/merge/split/delete actions', async () => {
    await setup();
    fireEvent.contextMenu(cell('1'), { clientX: 10, clientY: 10 });

    const menu = screen.getByRole('menu', { name: '표 편집' });
    const labels = within(menu).getAllByRole('menuitem').map((item) => item.textContent);
    expect(labels).toEqual([
      '위에 행 삽입',
      '아래에 행 삽입',
      '행 삭제',
      '왼쪽에 열 삽입',
      '오른쪽에 열 삽입',
      '열 삭제',
      '셀 병합',
      '셀 분할',
      '표 삭제',
    ]);
    // 셀 하나만 선택된 상태에서는 병합/분할이 꺼져 있다.
    expect(within(menu).getByRole('menuitem', { name: '셀 병합' })).toBeDisabled();
    expect(within(menu).getByRole('menuitem', { name: '셀 분할' })).toBeDisabled();
  });

  it('does not open outside of a table (the browser menu stays)', async () => {
    const editor = await setup(`Plain paragraph\n\n${TABLE}`);
    const paragraph = editor.view.dom.querySelector('p') as HTMLElement;
    const notPrevented = fireEvent.contextMenu(paragraph);
    expect(notPrevented).toBe(true);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens from the keyboard context-menu key, where the event target is the editor itself', async () => {
    const editor = await setup();
    act(() => {
      editor.commands.setTextSelection(editor.view.posAtDOM(cell('1'), 0) + 1);
    });
    fireEvent.contextMenu(editor.view.dom);
    expect(screen.getByRole('menu', { name: '표 편집' })).toBeInTheDocument();
  });

  it('inserts and deletes rows and columns around the clicked cell', async () => {
    const editor = await setup();
    expect([rowCount(editor), colCount(editor)]).toEqual([3, 2]);

    fireEvent.contextMenu(cell('1'));
    fireEvent.click(screen.getByRole('menuitem', { name: '아래에 행 삽입' }));
    expect(rowCount(editor)).toBe(4);
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.contextMenu(cell('2'));
    fireEvent.click(screen.getByRole('menuitem', { name: '오른쪽에 열 삽입' }));
    expect(colCount(editor)).toBe(3);

    fireEvent.contextMenu(cell('2'));
    fireEvent.click(screen.getByRole('menuitem', { name: '열 삭제' }));
    expect(colCount(editor)).toBe(2);

    fireEvent.contextMenu(cell('3'));
    fireEvent.click(screen.getByRole('menuitem', { name: '행 삭제' }));
    expect(rowCount(editor)).toBe(3);
    expect(editor.getText()).not.toContain('3');
  });

  it('acts on the clicked cell, not on wherever the cursor happened to be', async () => {
    const editor = await setup();
    editor.commands.setTextSelection(editor.state.doc.firstChild!.nodeSize - 3); // 마지막 셀 쪽
    fireEvent.contextMenu(cell('A'));
    fireEvent.click(screen.getByRole('menuitem', { name: '위에 행 삽입' }));
    const firstRowText = editor.state.doc.firstChild!.firstChild!.textContent;
    expect(firstRowText).toBe('');
  });

  it('merges selected cells, saves them as an HTML table, and splits them again', async () => {
    const editor = await setup();
    const headerStart = editor.view.posAtDOM(cell('A'), 0) - 1;
    const headerEnd = editor.view.posAtDOM(cell('B'), 0) - 1;
    act(() => {
      editor.view.dispatch(
        editor.state.tr.setSelection(CellSelection.create(editor.state.doc, headerStart, headerEnd)),
      );
    });

    // 선택된 셀 위에서 오른쪽 버튼을 눌러도 여러 셀 선택이 유지돼야 한다.
    fireEvent.contextMenu(cell('B'));
    expect(editor.state.selection).toBeInstanceOf(CellSelection);
    fireEvent.click(screen.getByRole('menuitem', { name: '셀 병합' }));

    const merged = editor.state.doc.firstChild!.firstChild!.firstChild!;
    expect(merged.attrs.colspan).toBe(2);
    expect(serializeToMarkdown(editor.state.doc)).toContain('<th colspan="2">');

    fireEvent.contextMenu(cell('A'));
    expect(screen.getByRole('menuitem', { name: '셀 분할' })).toBeEnabled();
    fireEvent.click(screen.getByRole('menuitem', { name: '셀 분할' }));
    expect(editor.state.doc.firstChild!.firstChild!.firstChild!.attrs.colspan).toBe(1);
    // 분할하면 병합 없는 표이므로 다시 GFM으로 저장된다.
    expect(serializeToMarkdown(editor.state.doc)).not.toContain('<table>');
    expect(serializeToMarkdown(editor.state.doc)).toContain('| --- | --- |');
  });

  it('deletes the whole table', async () => {
    const editor = await setup(`Before\n\n${TABLE}\n\nAfter`);
    fireEvent.contextMenu(cell('1'));
    fireEvent.click(screen.getByRole('menuitem', { name: '표 삭제' }));
    expect(editor.view.dom.querySelector('table')).toBeNull();
    expect(editor.getText()).toContain('Before');
    expect(editor.getText()).toContain('After');
  });

  it('closes with Escape and when clicking elsewhere', async () => {
    await setup();
    fireEvent.contextMenu(cell('1'));
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();

    fireEvent.contextMenu(cell('1'));
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
