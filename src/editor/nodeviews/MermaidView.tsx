import { useEffect, useState } from 'react';
import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { DiagramToggle, type DiagramViewMode } from './DiagramToggle';
import { renderMermaid } from './mermaidRenderer';
import { useDebouncedValue } from './useDebouncedValue';

// ProseMirror의 contentDOM(NodeViewContent)은 항상 마운트된 상태를 유지해야
// 커서/선택 매핑이 깨지지 않는다. 코드/미리보기 전환은 조건부 렌더링이 아니라
// CSS로 감춰서 처리한다.
export function MermaidView({ node }: ReactNodeViewProps) {
  // 새로 만든(비어 있는) 블록은 코드 모드로 시작해야 한다 — 미리보기 모드는
  // <pre>를 display:none으로 감추는데, 생성 직후 커서를 그 안에 두려는
  // ProseMirror의 시도가 숨겨진 요소에는 캐럿을 놓을 수 없어 조용히
  // 실패하고 커서가 문서 맨 앞으로 튕겨 나가는 문제가 있었다.
  const [mode, setMode] = useState<DiagramViewMode>(() => (node.textContent.trim() ? 'preview' : 'code'));
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const source = node.textContent;
  const debouncedSource = useDebouncedValue(source, 400);

  useEffect(() => {
    if (!debouncedSource.trim()) {
      setSvg(null);
      setError(null);
      return;
    }

    let cancelled = false;
    renderMermaid(debouncedSource)
      .then((result) => {
        if (cancelled) return;
        setSvg(result);
        setError(null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setSvg(null);
        setError(err instanceof Error ? err.message : String(err));
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSource]);

  return (
    <NodeViewWrapper className="markwiz-diagram" data-diagram-type="mermaid">
      <DiagramToggle mode={mode} onToggle={() => setMode((m) => (m === 'preview' ? 'code' : 'preview'))} />
      <pre className={mode === 'code' ? 'markwiz-diagram-source' : 'markwiz-diagram-source markwiz-hidden'}>
        <NodeViewContent<'code'> as="code" />
      </pre>
      <div
        className={mode === 'preview' ? 'markwiz-diagram-preview' : 'markwiz-diagram-preview markwiz-hidden'}
        contentEditable={false}
      >
        {error && <div className="markwiz-diagram-error">{error}</div>}
        {!error && svg && <div className="markwiz-diagram-svg" dangerouslySetInnerHTML={{ __html: svg }} />}
        {!error && !svg && <div className="markwiz-diagram-empty">다이어그램 내용을 입력하세요.</div>}
      </div>
    </NodeViewWrapper>
  );
}
