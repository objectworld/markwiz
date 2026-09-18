export type DiagramViewMode = 'preview' | 'code';

interface DiagramToggleProps {
  mode: DiagramViewMode;
  onToggle: () => void;
}

// Mermaid/PlantUML 노드뷰가 공유하는 코드/렌더링 토글 버튼.
export function DiagramToggle({ mode, onToggle }: DiagramToggleProps) {
  return (
    <button
      type="button"
      className="markwiz-diagram-toggle"
      contentEditable={false}
      onClick={onToggle}
    >
      {mode === 'preview' ? '코드 보기' : '미리보기'}
    </button>
  );
}
