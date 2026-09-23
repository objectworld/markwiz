import { describe, expect, it } from 'vitest';
import { loadKeymap } from '../commands/keymap';
import { diagramActions, exportActions, fontActions, historyActions, insertActions, paragraphActions, viewActions } from '../ribbon/ribbonActions';
import { buildMenuModel, EXPORT_MENU_TEXT, RECENT_MENU_TEXT } from './menuModel';

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

describe('파일 > 내보내기', () => {
  it('is a submenu of the file menu (not a top-level menu) with the same items as the ribbon export group', () => {
    const file = buildMenuModel(loadKeymap())[0];
    const submenu = file.entries.find((entry) => entry.kind === 'submenu' && entry.text === EXPORT_MENU_TEXT);
    expect(submenu && submenu.kind === 'submenu' && submenu.entries.map((entry) => (entry.kind === 'item' ? entry.text : entry.kind))).toEqual(
      exportActions.map((action) => action.label),
    );
    expect(buildMenuModel(loadKeymap()).some((candidate) => candidate.text === EXPORT_MENU_TEXT)).toBe(false);
  });
});

describe('파일 > 최근에 연 파일', () => {
  const recentFiles = Array.from({ length: 10 }, (_, i) => ({ path: `C:\\docs\\note${i}.md`, name: `note${i}.md` }));
  const submenuOf = (groups: ReturnType<typeof buildMenuModel>) => {
    const entry = groups[0].entries.find((candidate) => candidate.kind === 'submenu' && candidate.text === RECENT_MENU_TEXT);
    if (!entry || entry.kind !== 'submenu') throw new Error('no submenu');
    return entry;
  };

  it('is a submenu of the file menu, after a separator that follows the file commands', () => {
    const file = buildMenuModel(loadKeymap(), recentFiles)[0];
    expect(file.text).toBe('파일');
    expect(file.entries[file.entries.length - 1]).toMatchObject({ kind: 'submenu', text: '최근에 연 파일' });
    expect(submenuOf(buildMenuModel(loadKeymap())).text).toBe('최근에 연 파일');
  });

  it('shows a disabled placeholder when nothing was opened yet', () => {
    const { entries } = submenuOf(buildMenuModel(loadKeymap(), []));
    expect(entries).toHaveLength(1);
    expect(entries[0]).toMatchObject({ kind: 'item', text: '(최근 파일 없음)', disabled: true });
  });

  it('lists the files in order with their folder, plus a clear action', () => {
    const { entries } = submenuOf(buildMenuModel(loadKeymap(), recentFiles));
    const items = entries.filter((entry) => entry.kind === 'item');
    expect(items.map((entry) => entry.text)).toEqual([...recentFiles.map((file) => file.name), '목록 지우기']);
    expect(items[0]).toMatchObject({ detail: 'C:/docs', title: 'C:\\docs\\note0.md' });
    expect(entries.filter((entry) => entry.kind === 'item' && entry.id.startsWith('recent:'))).toHaveLength(10);
  });

  it('keeps the file menu top-level items identical to the ribbon file group', () => {
    const names = buildMenuModel(loadKeymap(), recentFiles)[0].entries.flatMap((entry) => (entry.kind === 'item' ? [entry.text] : []));
    expect(names).toEqual(['새로 만들기', '열기', '저장', '다른 이름으로 저장']);
  });
});
