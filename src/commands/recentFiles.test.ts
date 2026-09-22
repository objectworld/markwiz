import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  addRecentFile,
  clearRecentFiles,
  folderOf,
  getRecentFiles,
  MAX_RECENT_FILES,
  removeRecentFile,
  resetRecentFilesCache,
  subscribeRecentFiles,
} from './recentFiles';

const file = (n: number) => ({ path: `C:\\docs\\note${n}.md`, name: `note${n}.md` });

beforeEach(() => {
  localStorage.clear();
  resetRecentFilesCache();
});

describe('recent files', () => {
  it('starts empty and puts the most recently opened file first', () => {
    expect(getRecentFiles()).toEqual([]);
    addRecentFile(file(1));
    addRecentFile(file(2));
    expect(getRecentFiles().map((f) => f.name)).toEqual(['note2.md', 'note1.md']);
  });

  it('keeps at most 10 files and drops the oldest', () => {
    for (let i = 1; i <= 13; i += 1) addRecentFile(file(i));
    const names = getRecentFiles().map((f) => f.name);
    expect(MAX_RECENT_FILES).toBe(10);
    expect(names).toHaveLength(10);
    expect(names[0]).toBe('note13.md');
    expect(names[9]).toBe('note4.md');
    expect(names).not.toContain('note3.md');
  });

  it('moves a file that is opened again to the front without duplicating it', () => {
    addRecentFile(file(1));
    addRecentFile(file(2));
    addRecentFile(file(3));
    addRecentFile(file(1));
    expect(getRecentFiles().map((f) => f.name)).toEqual(['note1.md', 'note3.md', 'note2.md']);
  });

  it('treats Windows paths as the same file regardless of case and slash direction', () => {
    addRecentFile({ path: 'C:\\Docs\\Note.md', name: 'Note.md' });
    addRecentFile({ path: 'c:/docs/note.md', name: 'note.md' });
    expect(getRecentFiles()).toEqual([{ path: 'c:/docs/note.md', name: 'note.md' }]);
  });

  it('keeps POSIX paths that differ only by case as different files', () => {
    addRecentFile({ path: '/home/me/A.md', name: 'A.md' });
    addRecentFile({ path: '/home/me/a.md', name: 'a.md' });
    expect(getRecentFiles()).toHaveLength(2);
  });

  it('removes one file and clears the whole list', () => {
    addRecentFile(file(1));
    addRecentFile(file(2));
    removeRecentFile('c:/DOCS/note1.md');
    expect(getRecentFiles().map((f) => f.name)).toEqual(['note2.md']);
    clearRecentFiles();
    expect(getRecentFiles()).toEqual([]);
  });

  it('survives an app restart by reading the saved list back', () => {
    addRecentFile(file(1));
    addRecentFile(file(2));
    resetRecentFilesCache();
    expect(getRecentFiles().map((f) => f.name)).toEqual(['note2.md', 'note1.md']);
  });

  it('ignores a corrupted or oversized saved list', () => {
    localStorage.setItem('markwiz:recent-files', '{not json');
    expect(getRecentFiles()).toEqual([]);

    resetRecentFilesCache();
    const many = Array.from({ length: 15 }, (_, i) => file(i));
    localStorage.setItem('markwiz:recent-files', JSON.stringify([...many, { path: 1 }, null, 'x']));
    expect(getRecentFiles()).toHaveLength(10);

    resetRecentFilesCache();
    localStorage.setItem('markwiz:recent-files', JSON.stringify([{ path: '', name: 'x' }, { name: 'no path' }, file(1)]));
    expect(getRecentFiles()).toEqual([file(1)]);
  });

  it('notifies subscribers on every change', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeRecentFiles(listener);
    addRecentFile(file(1));
    removeRecentFile(file(1).path);
    clearRecentFiles();
    expect(listener).toHaveBeenCalledTimes(3);
    unsubscribe();
    addRecentFile(file(2));
    expect(listener).toHaveBeenCalledTimes(3);
  });
});

describe('folderOf', () => {
  it('returns the containing folder', () => {
    expect(folderOf('C:\\docs\\notes\\a.md')).toBe('C:/docs/notes');
    expect(folderOf('/home/me/a.md')).toBe('/home/me');
    expect(folderOf('/a.md')).toBe('/');
  });
});
