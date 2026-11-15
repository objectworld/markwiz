import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

// 찾기/바꾸기. 검색어와 옵션은 이 플러그인 상태가 들고 있고(에디터 인스턴스마다 따로), 일치 목록은
// 문서가 바뀔 때마다 다시 계산한다. 일치 부분은 데코레이션으로만 칠하므로 문서(마크다운)에는 영향이 없다.

export interface SearchMatch {
  from: number;
  to: number;
}

export interface SearchState {
  query: string;
  caseSensitive: boolean;
  matches: SearchMatch[];
  // matches 안의 현재 위치. 일치가 없으면 -1
  current: number;
}

export const searchKey = new PluginKey<SearchState>('markwizSearch');

const EMPTY: SearchState = { query: '', caseSensitive: false, matches: [], current: -1 };

// 이미지 같은 리프 노드는 글자 한 칸(￼)으로 세어 위치 계산이 문서 위치와 1:1로 맞게 한다.
const LEAF = '￼';

// 일치는 한 문단(텍스트 블록) 안에서만 찾는다. 문단 경계를 넘는 검색어는 일치하지 않는다.
export function findMatches(doc: PMNode, query: string, caseSensitive: boolean): SearchMatch[] {
  if (!query) return [];
  const needle = caseSensitive ? query : query.toLowerCase();
  const matches: SearchMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    const text = node.textBetween(0, node.content.size, undefined, LEAF);
    const haystack = caseSensitive ? text : text.toLowerCase();
    // toLowerCase가 글자 수를 바꾸는 드문 문자(İ 등)가 있으면 위치가 어긋나므로 그 문단은 건너뛴다.
    if (haystack.length !== text.length) return false;
    let index = haystack.indexOf(needle);
    while (index !== -1) {
      matches.push({ from: pos + 1 + index, to: pos + 1 + index + needle.length });
      index = haystack.indexOf(needle, index + needle.length);
    }
    return false;
  });
  return matches;
}

// 문서가 바뀐 뒤에도 가능하면 보고 있던 일치(같은 위치 이후의 첫 일치)를 유지한다.
function pickCurrent(matches: SearchMatch[], anchor: number): number {
  if (matches.length === 0) return -1;
  const index = matches.findIndex((match) => match.from >= anchor);
  return index === -1 ? 0 : index;
}

export const Search = Extension.create({
  name: 'search',

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchKey,
        state: {
          init: () => EMPTY,
          apply(tr: Transaction, value: SearchState, _old: EditorState, next: EditorState): SearchState {
            const meta = tr.getMeta(searchKey) as Partial<Pick<SearchState, 'query' | 'caseSensitive' | 'current'>> | undefined;
            if (!meta && !tr.docChanged) return value;
            const query = meta?.query ?? value.query;
            const caseSensitive = meta?.caseSensitive ?? value.caseSensitive;
            const matches = findMatches(next.doc, query, caseSensitive);
            if (meta?.current !== undefined) {
              const current = matches.length === 0 ? -1 : ((meta.current % matches.length) + matches.length) % matches.length;
              return { query, caseSensitive, matches, current };
            }
            const anchor = value.matches[value.current]?.from ?? 0;
            const mapped = tr.docChanged ? tr.mapping.map(anchor) : anchor;
            return { query, caseSensitive, matches, current: pickCurrent(matches, mapped) };
          },
        },
        props: {
          decorations(state) {
            const search = searchKey.getState(state);
            if (!search || search.matches.length === 0) return null;
            return DecorationSet.create(
              state.doc,
              search.matches.map((match, index) =>
                Decoration.inline(match.from, match.to, {
                  class: index === search.current ? 'markwiz-search-match markwiz-search-current' : 'markwiz-search-match',
                }),
              ),
            );
          },
        },
      }),
    ];
  },
});

export function getSearchState(view: EditorView): SearchState {
  return searchKey.getState(view.state) ?? EMPTY;
}

function scrollToCurrent(view: EditorView): void {
  const search = getSearchState(view);
  const match = search.matches[search.current];
  if (!match) return;
  try {
    const { node } = view.domAtPos(match.from);
    const element = node.nodeType === 1 ? (node as HTMLElement) : node.parentElement;
    element?.scrollIntoView?.({ block: 'center', inline: 'nearest' });
  } catch {
    // 화면 밖이거나 아직 그려지지 않은 위치는 스크롤하지 않는다.
  }
}

// 검색어/옵션을 바꾼다. 첫 일치(또는 지금 커서 이후의 첫 일치)를 현재 위치로 잡는다.
export function setSearch(view: EditorView, query: string, caseSensitive: boolean): void {
  const tr = view.state.tr.setMeta(searchKey, { query, caseSensitive });
  view.dispatch(tr);
  const search = getSearchState(view);
  // 새로 검색할 때는 커서 위치부터 가장 가까운 일치로 간다.
  const anchor = view.state.selection.from;
  const index = pickCurrent(search.matches, anchor);
  if (index !== search.current) view.dispatch(view.state.tr.setMeta(searchKey, { current: index }));
  scrollToCurrent(view);
}

export function clearSearch(view: EditorView): void {
  view.dispatch(view.state.tr.setMeta(searchKey, { query: '', current: -1 }));
}

export function stepSearch(view: EditorView, direction: 1 | -1): void {
  const search = getSearchState(view);
  if (search.matches.length === 0) return;
  view.dispatch(view.state.tr.setMeta(searchKey, { current: search.current + direction }));
  scrollToCurrent(view);
}

// 현재 일치를 바꾸고 다음 일치로 넘어간다. 바꾼 개수(0 또는 1)를 돌려준다.
export function replaceCurrent(view: EditorView, replacement: string): number {
  const search = getSearchState(view);
  const match = search.matches[search.current];
  if (!match) return 0;
  const tr = view.state.tr;
  if (replacement) tr.insertText(replacement, match.from, match.to);
  else tr.delete(match.from, match.to);
  // 바꾼 글자 바로 뒤부터 다음 일치를 찾는다(바꾼 글자가 검색어를 포함해도 무한히 바꾸지 않도록).
  tr.setMeta(searchKey, {});
  view.dispatch(tr);
  const after = getSearchState(view);
  const resume = match.from + replacement.length;
  const index = pickCurrent(after.matches, resume);
  view.dispatch(view.state.tr.setMeta(searchKey, { current: index }));
  scrollToCurrent(view);
  return 1;
}

// 모든 일치를 한 번의 실행 취소 단위로 바꾼다. 바꾼 개수를 돌려준다.
export function replaceAll(view: EditorView, replacement: string): number {
  const { matches } = getSearchState(view);
  if (matches.length === 0) return 0;
  const tr = view.state.tr;
  for (const match of [...matches].reverse()) {
    if (replacement) tr.insertText(replacement, match.from, match.to);
    else tr.delete(match.from, match.to);
  }
  view.dispatch(tr);
  return matches.length;
}

// 선택한 글자를 찾기 입력의 초기값으로 쓴다(한 줄 안의 선택만).
export function selectedTextForSearch(view: EditorView): string {
  const { from, to, empty } = view.state.selection;
  if (empty || !(view.state.selection instanceof TextSelection)) return '';
  const text = view.state.doc.textBetween(from, to, '\n', LEAF);
  return text.includes('\n') || text.includes(LEAF) ? '' : text;
}
