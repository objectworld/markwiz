import { t, useLanguage } from '../../i18n/i18n';

export type DiagramViewMode = 'preview' | 'code';

interface DiagramToggleProps {
  mode: DiagramViewMode;
  onToggle: () => void;
}

// Mermaid/PlantUML 노드뷰가 공유하는 코드/렌더링 토글 버튼.
export function DiagramToggle({ mode, onToggle }: DiagramToggleProps) {
  useLanguage();
  return (
    <button
      type="button"
      className="markwiz-diagram-toggle"
      contentEditable={false}
      onClick={onToggle}
    >
      {mode === 'preview' ? t('diagram.showCode') : t('diagram.showPreview')}
    </button>
  );
}
