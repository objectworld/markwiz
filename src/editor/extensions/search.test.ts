import { Editor } from '@tiptap/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { editorExtensions } from './index';
import { clearSearch, getSearchState, replaceAll, replaceCurrent, setSearch, stepSearch } from './search';

let editor: Editor;

beforeEach(() => {
  editor = new Editor({ extensions: editorExtensions, content: '<p>Apple apple APPLE</p><p>pineapple</p>' });
});
afterEach(() => editor.destroy());

const text = () => editor.getText({ blockSeparator: '|' });

describe('find', () => {
  it('ignores case by default and counts every occurrence', () => {
    setSearch(editor.view, 'apple', false);
    expect(getSearchState(editor.view).matches).toHaveLength(4);
  });

  it('matches case exactly when the option is on', () => {
    setSearch(editor.view, 'apple', true);
    expect(getSearchState(editor.view).matches).toHaveLength(2);
    setSearch(editor.view, 'Apple', true);
    expect(getSearchState(editor.view).matches).toHaveLength(1);
  });

  it('steps through matches and wraps around', () => {
    setSearch(editor.view, 'apple', false);
    expect(getSearchState(editor.view).current).toBe(0);
    stepSearch(editor.view, -1);
    expect(getSearchState(editor.view).current).toBe(3);
    stepSearch(editor.view, 1);
    expect(getSearchState(editor.view).current).toBe(0);
  });

  it('marks matches with decorations and clears them', () => {
    setSearch(editor.view, 'apple', false);
    expect(editor.view.dom.querySelectorAll('.markwiz-search-match')).toHaveLength(4);
    expect(editor.view.dom.querySelectorAll('.markwiz-search-current')).toHaveLength(1);
    clearSearch(editor.view);
    expect(editor.view.dom.querySelectorAll('.markwiz-search-match')).toHaveLength(0);
  });

  it('finds nothing for an empty query', () => {
    setSearch(editor.view, '', false);
    expect(getSearchState(editor.view).matches).toHaveLength(0);
  });
});

describe('replace', () => {
  it('replaces the current match and moves on to the next one', () => {
    setSearch(editor.view, 'apple', true);
    replaceCurrent(editor.view, 'pear');
    expect(text()).toBe('Apple pear APPLE|pineapple');
    expect(getSearchState(editor.view).matches).toHaveLength(1);
  });

  it('does not loop when the replacement contains the query', () => {
    setSearch(editor.view, 'a', false);
    const before = getSearchState(editor.view).matches.length;
    replaceCurrent(editor.view, 'aa');
    expect(getSearchState(editor.view).matches).toHaveLength(before + 1);
  });

  it('replaces all matches as one undo step', () => {
    setSearch(editor.view, 'apple', false);
    expect(replaceAll(editor.view, 'X')).toBe(4);
    expect(text()).toBe('X X X|pineX');
    editor.commands.undo();
    expect(text()).toBe('Apple apple APPLE|pineapple');
  });

  it('respects the case option when replacing all', () => {
    setSearch(editor.view, 'apple', true);
    replaceAll(editor.view, '');
    expect(text()).toBe('Apple  APPLE|pine');
  });
});
