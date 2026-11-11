import { describe, expect, it } from 'vitest';
import { buildHtmlDocument, cleanEditorDom, escapeHtml } from './htmlConvert';

function dom(html: string): HTMLElement {
  const root = document.createElement('div');
  root.className = 'ProseMirror tiptap';
  root.setAttribute('contenteditable', 'true');
  root.innerHTML = html;
  return root;
}

const keepSrc = { imageSrc: (img: HTMLImageElement) => img.getAttribute('src') };

describe('cleanEditorDom', () => {
  it('drops raw markdown markers, widgets and editing attributes', () => {
    const root = dom(
      '<h1 class="is-editor-empty" data-placeholder="x"><span class="markwiz-raw-marker markwiz-raw-block"># </span>Title</h1>' +
        '<p><span class="ProseMirror-widget">w</span>text<br class="ProseMirror-trailingBreak"></p>',
    );
    const clean = cleanEditorDom(root, keepSrc);
    expect(clean.innerHTML).toBe('<h1>Title</h1><p>text</p>');
    expect(clean.hasAttribute('contenteditable')).toBe(false);
    expect(clean.className).toBe('');
  });

  it('does not mutate the live editor DOM', () => {
    const root = dom('<p><span class="markwiz-raw-marker">**</span>x</p>');
    cleanEditorDom(root, keepSrc);
    expect(root.querySelector('.markwiz-raw-marker')).not.toBeNull();
    expect(root.getAttribute('contenteditable')).toBe('true');
  });

  it('keeps checked state of task items as a disabled checkbox', () => {
    const root = dom(
      '<ul data-type="taskList"><li><label><input type="checkbox"><span style="position: absolute">Task item checkbox for a</span></label><div><p>a</p></div></li>' +
        '<li><label><input type="checkbox"></label><div><p>b</p></div></li></ul>',
    );
    root.querySelectorAll<HTMLInputElement>('input')[1].checked = true;
    const boxes = cleanEditorDom(root, keepSrc).querySelectorAll('input');
    expect(boxes[0].hasAttribute('checked')).toBe(false);
    expect(boxes[1].hasAttribute('checked')).toBe(true);
    expect(boxes[1].hasAttribute('disabled')).toBe(true);
    expect(boxes[0].closest('label')?.querySelector('span')).toBeNull();
  });

  it('keeps only the rendered picture of a diagram', () => {
    const root = dom(
      '<div class="markwiz-diagram"><button class="markwiz-diagram-toggle">코드 보기</button>' +
        '<pre class="markwiz-diagram-source markwiz-hidden">graph TD</pre>' +
        '<div class="markwiz-diagram-preview"><div class="markwiz-diagram-svg markwiz-diagram-enlargeable"><svg><text>A</text></svg></div></div></div>',
    );
    const clean = cleanEditorDom(root, keepSrc);
    expect(clean.querySelector('svg')).not.toBeNull();
    expect(clean.querySelector('pre')).toBeNull();
    expect(clean.querySelector('button')).toBeNull();
    expect(clean.querySelector('.markwiz-diagram-svg')).not.toBeNull();
    expect(clean.querySelector('.markwiz-diagram-enlargeable')).toBeNull();
  });

  it('falls back to the source code when the diagram failed to render', () => {
    const root = dom(
      '<div class="markwiz-diagram"><pre class="markwiz-diagram-source markwiz-hidden">not valid</pre>' +
        '<div class="markwiz-diagram-preview"><div class="markwiz-diagram-error">oops</div></div></div>',
    );
    const clean = cleanEditorDom(root, keepSrc);
    expect(clean.querySelector('pre')?.textContent).toBe('not valid');
    expect(clean.querySelector('.markwiz-diagram-error')).toBeNull();
  });

  it('rewrites image sources with the supplied function and replaces unreadable ones with their alt text', () => {
    const root = dom('<p><img src="asset://a.png" alt="A"><img src="./gone.png" alt="Gone"></p>');
    const clean = cleanEditorDom(root, {
      imageSrc: (img) => (img.getAttribute('src') === 'asset://a.png' ? 'data:image/png;base64,AAAA' : null),
    });
    const images = clean.querySelectorAll('img');
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute('src')).toBe('data:image/png;base64,AAAA');
    expect(clean.querySelector('p')?.textContent).toBe('Gone');
    // 원본의 src는 그대로
    expect(root.querySelector('img')?.getAttribute('src')).toBe('asset://a.png');
  });
});

describe('buildHtmlDocument', () => {
  it('wraps the body in a standalone page with title, language, document CSS and print rules', () => {
    const html = buildHtmlDocument({ title: 'A & <B>', lang: 'ko', css: '.x{color:red}', body: '<p>hi</p>' });
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<html lang="ko">');
    expect(html).toContain('<title>A &amp; &lt;B&gt;</title>');
    expect(html).toContain('.x{color:red}');
    expect(html).toContain('@page { margin: 0.75in; }');
    expect(html).toContain('<div class="ProseMirror">\n<p>hi</p>\n</div>');
  });

  it('escapes html special characters', () => {
    expect(escapeHtml('<a href="x">&</a>')).toBe('&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;');
  });
});
