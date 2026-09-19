import { NodeViewContent, NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import { DiagramView } from './DiagramView';
import { renderMermaid } from './mermaidRenderer';
import { renderPlantuml } from './plantumlClient';

// CodeBlockLowlight의 커스텀 NodeView. language가 다이어그램 언어일 때만
// 전용 뷰로 위임하고, 그 외에는 lowlight 구문 강조가 계속 동작하도록
// 기존 <pre><code> 구조를 그대로 유지한다.
export function CodeBlockView(props: ReactNodeViewProps) {
  const language = props.node.attrs.language as string | null;

  if (language === 'mermaid') {
    return <DiagramView {...props} type="mermaid" render={renderMermaid} />;
  }

  if (language === 'plantuml') {
    return <DiagramView {...props} type="plantuml" render={renderPlantuml} />;
  }

  return (
    <NodeViewWrapper as="pre">
      <NodeViewContent<'code'> as="code" />
    </NodeViewWrapper>
  );
}
