import { useEffect, useReducer, useRef, useState } from 'react';
import type { Editor } from '@tiptap/core';
import { ChevronDown, ChevronRight, ChevronUp, X } from 'lucide-react';
import { showNotice } from '../commands/viewState';
import { t, useLanguage } from '../i18n/i18n';
import { clearSearch, getSearchState, replaceAll, replaceCurrent, selectedTextForSearch, setSearch, stepSearch } from './extensions/search';

const ICON_BUTTON = 'flex h-6 w-6 items-center justify-center rounded text-ink-muted hover:bg-chrome-hover disabled:opacity-40 disabled:hover:bg-transparent';
const TEXT_BUTTON = 'rounded border border-chrome-border px-2 py-0.5 text-[12px] hover:bg-chrome-hover disabled:opacity-40 disabled:hover:bg-transparent';
const INPUT = 'min-w-0 flex-1 rounded border border-chrome-border bg-white px-2 py-1 text-[13px] text-ink outline-none focus:border-accent';

// 문서 오른쪽 위에 뜨는 찾기/바꾸기 창(모달이 아니라 문서를 계속 편집할 수 있다).
// 검색어와 일치 목록은 에디터의 search 플러그인 상태가 들고 있고, 이 창은 그것을 보여주고 조작한다.
export function FindDialog({ editor, replaceMode, focusToken, onClose }: { editor: Editor; replaceMode: boolean; focusToken: number; onClose: () => void }) {
  useLanguage();
  const [query, setQuery] = useState(() => selectedTextForSearch(editor.view));
  const [replacement, setReplacement] = useState('');
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [showReplace, setShowReplace] = useState(replaceMode);
  const findRef = useRef<HTMLInputElement>(null);
  const replaceRef = useRef<HTMLInputElement>(null);
  const queryRef = useRef(query);
  queryRef.current = query;
  const [, rerender] = useReducer((n: number) => n + 1, 0);

  // Ctrl+F / Ctrl+H를 다시 누르면 이미 열려 있어도 입력으로 포커스를 옮긴다(Ctrl+H면 바꾸기 입력).
  useEffect(() => {
    if (replaceMode) setShowReplace(true);
    // 찾을 내용이 비어 있으면 먼저 그것부터 입력하게 한다.
    const target = replaceMode && queryRef.current ? replaceRef : findRef;
    // 바꾸기 입력은 같은 렌더에서 막 나타났을 수 있어 한 틱 뒤에 포커스한다.
    const id = window.setTimeout(() => {
      const input = target.current ?? findRef.current;
      input?.focus();
      input?.select();
    }, 0);
    return () => window.clearTimeout(id);
  }, [focusToken, replaceMode]);

  // 문서 편집/탭 전환으로 일치 목록이 바뀌면 개수를 다시 그린다.
  useEffect(() => {
    const onTransaction = () => rerender();
    editor.on('transaction', onTransaction);
    return () => void editor.off('transaction', onTransaction);
  }, [editor]);

  // 검색어/옵션/대상 문서가 바뀌면 그 에디터에 적용한다. 닫거나 다른 탭으로 옮기면 이전 에디터의 표시를 지운다.
  useEffect(() => {
    setSearch(editor.view, query, caseSensitive);
  }, [editor, query, caseSensitive]);
  useEffect(() => () => {
    if (!editor.isDestroyed) clearSearch(editor.view);
  }, [editor]);

  const search = getSearchState(editor.view);
  const hasMatches = search.matches.length > 0;
  const status = !query ? '' : hasMatches ? t('find.count', { current: search.current + 1, total: search.matches.length }) : t('find.none');

  const next = (direction: 1 | -1) => stepSearch(editor.view, direction);
  const doReplace = () => {
    replaceCurrent(editor.view, replacement);
  };
  const doReplaceAll = () => {
    const count = replaceAll(editor.view, replacement);
    if (count > 0) showNotice(t('find.replaced', { n: count }));
  };

  const onKeyDown = (event: React.KeyboardEvent, onEnter: (shift: boolean) => void) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      editor.commands.focus();
    } else if (event.key === 'Enter') {
      event.preventDefault();
      event.stopPropagation();
      onEnter(event.shiftKey);
    }
  };

  return (
    <div
      role="dialog"
      aria-label={t('find.title')}
      className="fixed right-6 top-24 z-40 w-[360px] max-w-[calc(100%-32px)] rounded-lg border border-chrome-border bg-chrome p-2 text-ink shadow-lg"
    >
      <div className="flex items-center gap-1">
        <button type="button" aria-label={t('find.toggleReplace')} aria-expanded={showReplace} title={t('find.toggleReplace')} className={ICON_BUTTON} onClick={() => setShowReplace((v) => !v)}>
          {showReplace ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
        <input
          ref={findRef}
          aria-label={t('find.findLabel')}
          placeholder={t('find.findLabel')}
          className={INPUT}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => onKeyDown(event, (shift) => next(shift ? -1 : 1))}
        />
        <span className="w-[52px] shrink-0 text-center text-[11px] text-ink-muted" aria-live="polite">
          {status}
        </span>
        <button type="button" aria-label={t('find.prev')} title={t('find.prev')} className={ICON_BUTTON} disabled={!hasMatches} onClick={() => next(-1)}>
          <ChevronUp size={14} />
        </button>
        <button type="button" aria-label={t('find.next')} title={t('find.next')} className={ICON_BUTTON} disabled={!hasMatches} onClick={() => next(1)}>
          <ChevronDown size={14} />
        </button>
        <button type="button" aria-label={t('find.close')} title={t('find.close')} className={ICON_BUTTON} onClick={onClose}>
          <X size={14} />
        </button>
      </div>
      {showReplace && (
        <div className="mt-1.5 flex items-center gap-1 pl-[28px]">
          <input
            ref={replaceRef}
            aria-label={t('find.replaceLabel')}
            placeholder={t('find.replaceLabel')}
            className={INPUT}
            value={replacement}
            onChange={(event) => setReplacement(event.target.value)}
            onKeyDown={(event) => onKeyDown(event, () => doReplace())}
          />
          <button type="button" className={TEXT_BUTTON} disabled={!hasMatches} onClick={doReplace}>
            {t('find.replace')}
          </button>
          <button type="button" className={TEXT_BUTTON} disabled={!hasMatches} onClick={doReplaceAll}>
            {t('find.replaceAll')}
          </button>
        </div>
      )}
      <label className="mt-1.5 flex items-center gap-1.5 pl-[28px] text-[12px] text-ink-muted">
        <input type="checkbox" checked={caseSensitive} onChange={(event) => setCaseSensitive(event.target.checked)} />
        {t('find.caseSensitive')}
      </label>
    </div>
  );
}
