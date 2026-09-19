import { setViewState, useViewState } from '../commands/viewState';

// 소스 코드 모드: 문서를 마크다운 원문 그대로 편집한다. 모드를 끌 때 에디터에 다시 반영된다.
export function SourceEditor() {
  const { sourceText } = useViewState();

  return (
    <textarea
      aria-label="마크다운 소스"
      value={sourceText}
      spellCheck={false}
      autoFocus
      onChange={(event) => setViewState({ sourceText: event.target.value })}
      className="mx-auto block min-h-[1000px] w-[816px] max-w-[calc(100%-32px)] resize-none border border-chrome-border bg-white px-[72px] py-[72px] font-mono text-[14px] leading-relaxed text-ink shadow-[0_1px_3px_rgba(61,57,41,0.12)] outline-none"
    />
  );
}
