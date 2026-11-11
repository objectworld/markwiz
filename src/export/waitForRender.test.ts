import { describe, expect, it } from 'vitest';
import { hasPendingDiagrams, waitForRender } from './waitForRender';

function diagram(source: string, preview = ''): HTMLElement {
  const root = document.createElement('div');
  root.innerHTML = `<div class="markwiz-diagram"><pre class="markwiz-diagram-source">${source}</pre><div class="markwiz-diagram-preview">${preview}</div></div>`;
  return root;
}

describe('hasPendingDiagrams', () => {
  it('is true only for diagrams with source that have neither a picture nor an error yet', () => {
    expect(hasPendingDiagrams(diagram('graph TD; A-->B;'))).toBe(true);
    expect(hasPendingDiagrams(diagram('graph TD; A-->B;', '<div class="markwiz-diagram-svg"><svg></svg></div>'))).toBe(false);
    expect(hasPendingDiagrams(diagram('bad', '<div class="markwiz-diagram-error">x</div>'))).toBe(false);
    expect(hasPendingDiagrams(diagram('  '))).toBe(false);
  });
});

describe('waitForRender', () => {
  it('returns as soon as the pending diagram shows a picture', async () => {
    const root = diagram('graph TD; A-->B;');
    setTimeout(() => {
      root.querySelector('.markwiz-diagram-preview')!.innerHTML = '<div class="markwiz-diagram-svg"><svg></svg></div>';
    }, 120);
    const started = Date.now();
    await waitForRender(root);
    expect(root.querySelector('svg')).not.toBeNull();
    expect(Date.now() - started).toBeLessThan(2000);
  });

  it('gives up after the timeout instead of hanging', async () => {
    const started = Date.now();
    await waitForRender(diagram('graph TD; A-->B;'), { timeoutMs: 150 });
    expect(Date.now() - started).toBeGreaterThanOrEqual(150);
  });
});
