import { EditorContent, useEditor } from '@tiptap/react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { editorExtensions } from '../extensions';

// jsdom에는 Web Worker가 없으므로 PlantUML 클라이언트는 목으로 대체한다
// (실제 워커/엔진 렌더링은 plantumlEngine.test.ts와 브라우저 검증이 담당).
const renderPlantumlMock = vi.hoisted(() => vi.fn());
vi.mock('./plantumlClient', () => ({ renderPlantuml: renderPlantumlMock }));

function TestEditor({ content }: { content: string }) {
  const editor = useEditor({ extensions: editorExtensions, content, immediatelyRender: false });
  return <EditorContent editor={editor} />;
}

describe('Diagram node view', () => {
  describe('plantuml', () => {
    it('renders through the plantuml client and keeps the source editable', async () => {
      renderPlantumlMock.mockResolvedValue('<svg xmlns="http://www.w3.org/2000/svg"><text>Alice</text></svg>');
      render(<TestEditor content={'<pre><code class="language-plantuml">Alice -&gt; Bob : hi</code></pre>'} />);

      const wrapper = await screen.findByText('코드 보기').then((btn) => btn.closest('.markwiz-diagram'));
      expect(wrapper).toHaveAttribute('data-diagram-type', 'plantuml');

      await waitFor(() => {
        expect(wrapper!.querySelector('.markwiz-diagram-svg svg')).toBeTruthy();
      });
      expect(renderPlantumlMock).toHaveBeenCalledWith('Alice -> Bob : hi');
      expect(wrapper!.querySelector('.markwiz-diagram-source')?.textContent).toContain('Alice -> Bob');
    });

    it('shows the worker error without losing the source', async () => {
      renderPlantumlMock.mockRejectedValue(new Error('worker crashed'));
      render(<TestEditor content={'<pre><code class="language-plantuml">A -&gt; B</code></pre>'} />);

      const wrapper = await screen.findByText('코드 보기').then((btn) => btn.closest('.markwiz-diagram'));
      await waitFor(() => {
        expect(wrapper!.querySelector('.markwiz-diagram-error')?.textContent).toContain('worker crashed');
      });
      expect(wrapper!.querySelector('.markwiz-diagram-source')?.textContent).toContain('A -> B');
    });

    it('never touches the plantuml client for documents without plantuml blocks', async () => {
      renderPlantumlMock.mockClear();
      render(<TestEditor content={'<pre><code class="language-mermaid">graph TD; A--&gt;B;</code></pre>'} />);
      await screen.findByText('코드 보기');
      expect(renderPlantumlMock).not.toHaveBeenCalled();
    });
  });

  it('defaults a freshly created empty block to code mode so the caret can land in it', async () => {
    render(<TestEditor content={'<pre><code class="language-mermaid"></code></pre>'} />);

    // 빈 블록은 코드 모드로 시작해야 한다 (미리보기는 소스를 display:none으로
    // 감춰서, 막 생성된 블록에 커서를 두려는 시도가 실패하는 버그가 있었다).
    const toggle = await screen.findByText('미리보기');
    const wrapper = toggle.closest('.markwiz-diagram')!;
    expect(wrapper.querySelector('.markwiz-diagram-source')).not.toHaveClass('markwiz-hidden');
  });

  it('renders a diagram for a ```mermaid code block and keeps the source editable', async () => {
    render(<TestEditor content={'<pre><code class="language-mermaid">graph TD; A--&gt;B;</code></pre>'} />);

    const wrapper = await screen.findByText('코드 보기').then((btn) => btn.closest('.markwiz-diagram'));
    expect(wrapper).toBeTruthy();

    await waitFor(() => {
      expect(wrapper!.querySelector('.markwiz-diagram-svg svg')).toBeTruthy();
    });

    // 소스 코드 textContent는 항상 DOM에 남아 있어야 커서/편집이 유지된다.
    expect(wrapper!.querySelector('.markwiz-diagram-source')?.textContent).toContain('graph TD');
  });

  it('shows an error message for invalid mermaid syntax without losing the source', async () => {
    render(<TestEditor content={'<pre><code class="language-mermaid">not valid mermaid {{{</code></pre>'} />);

    const wrapper = await screen.findByText('코드 보기').then((btn) => btn.closest('.markwiz-diagram'));

    await waitFor(() => {
      expect(wrapper!.querySelector('.markwiz-diagram-error')).toBeTruthy();
    });

    expect(wrapper!.querySelector('.markwiz-diagram-source')?.textContent).toContain('not valid mermaid');
  });
});
