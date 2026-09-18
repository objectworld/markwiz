import { describe, expect, it } from 'vitest';
import { renderMermaid } from './mermaidRenderer';

describe('renderMermaid', () => {
  it('renders a simple flowchart to SVG', async () => {
    const svg = await renderMermaid('graph TD; A-->B;');
    expect(svg).toContain('<svg');
  });

  it('rejects invalid mermaid syntax', async () => {
    await expect(renderMermaid('this is not mermaid syntax {{{')).rejects.toBeTruthy();
  });

  it('produces distinct ids across renders so caches do not collide', async () => {
    const first = await renderMermaid('graph TD; A-->B;');
    const second = await renderMermaid('graph TD; A-->B;');
    const idOf = (svg: string) => svg.match(/id="([^"]+)"/)?.[1];
    expect(idOf(first)).not.toBe(idOf(second));
  });
});
