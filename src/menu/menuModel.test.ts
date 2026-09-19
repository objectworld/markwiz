import { describe, expect, it } from 'vitest';
import { loadKeymap } from '../commands/keymap';
import { diagramActions, fontActions, historyActions, insertActions, paragraphActions, viewActions } from '../ribbon/ribbonActions';
import { buildMenuModel } from './menuModel';

const model = buildMenuModel(loadKeymap());
const group = (text: string) => model.find((candidate) => candidate.text === text)!;
const items = (text: string) =>
  group(text).entries.flatMap((entry) => (entry.kind === 'item' ? [entry] : []));

describe('native menu model', () => {
  it('has the ribbon groups in order, then 도움말', () => {
    expect(model.map((candidate) => candidate.text)).toEqual(['파일', '편집', '글꼴', '단락', '삽입', '다이어그램', '보기', '도움말']);
  });

  it('lists the same items as the ribbon for each group', () => {
    const names = (text: string) => items(text).map((entry) => entry.text);
    expect(names('편집')).toEqual(historyActions.map((action) => action.label));
    expect(names('글꼴')).toEqual(fontActions.map((action) => action.label));
    expect(names('단락')).toEqual(paragraphActions.map((action) => action.label));
    expect(names('삽입')).toEqual(insertActions.map((action) => action.label));
    expect(names('다이어그램')).toEqual(diagramActions.map((action) => action.label));
    expect(names('보기')).toEqual(viewActions.map((action) => action.label));
    expect(names('도움말')).toEqual(['README 보기', 'Markwiz 정보']);
  });

  it('binds native accelerators only for file and view commands', () => {
    expect(items('파일').find((entry) => entry.id === 'file.save')?.accelerator).toBe('Ctrl+S');
    expect(items('보기').find((entry) => entry.id === 'view.focusMode')?.accelerator).toBe('F8');
    expect(items('글꼴').every((entry) => entry.accelerator === undefined)).toBe(true);
    expect(items('글꼴').find((entry) => entry.id === 'format.bold')?.shortcut).toBe('Ctrl+B');
  });

  it('puts the heading styles in a 스타일 submenu under 글꼴', () => {
    const submenu = group('글꼴').entries.find((entry) => entry.kind === 'submenu');
    expect(submenu && submenu.kind === 'submenu' && submenu.entries).toHaveLength(7);
  });
});
