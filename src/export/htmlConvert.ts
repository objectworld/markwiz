// HTML로 내보내기: 화면에 이미 그려진 에디터 DOM을 복제해서 편집용 흔적(원본 마크다운 마커, 다이어그램 토글,
// ProseMirror 내부 요소 등)을 걷어 내고, 이미지는 파일 하나로 열리도록 data URL로 끼워 넣는다.
// 문서 트리를 다시 HTML로 직렬화하지 않고 렌더링된 DOM을 쓰므로 화면(구문 강조, 다이어그램 SVG 포함)과 같은 모양이 된다.

const REMOVE_SELECTOR = [
  '.markwiz-raw-marker',
  '.markwiz-diagram-toggle',
  '.markwiz-typewriter-spacer',
  '.ProseMirror-widget',
  '.ProseMirror-gapcursor',
  '.ProseMirror-trailingBreak',
  'img.ProseMirror-separator',
].join(',');

const STRIP_ATTRIBUTES = ['contenteditable', 'draggable', 'spellcheck', 'translate', 'data-placeholder', 'tabindex'];
const STRIP_CLASSES = new Set(['tiptap', 'is-editor-empty', 'markwiz-current-block', 'markwiz-diagram-enlargeable']);
const IMAGE_SELECTOR = 'img:not(.ProseMirror-separator)';

export interface CleanOptions {
  // 화면의 <img>를 파일 안에 넣을 주소로 바꾼다. null이면 이미지를 대체 텍스트로 바꾼다.
  imageSrc: (img: HTMLImageElement) => string | null;
}

export function cleanEditorDom(live: HTMLElement, { imageSrc }: CleanOptions): HTMLElement {
  const clone = live.cloneNode(true) as HTMLElement;

  // 복제본과 원본의 <img>는 같은 순서라서 인덱스로 짝지을 수 있다(픽셀은 원본에서만 읽을 수 있다).
  const liveImages = [...live.querySelectorAll<HTMLImageElement>(IMAGE_SELECTOR)];
  [...clone.querySelectorAll<HTMLImageElement>(IMAGE_SELECTOR)].forEach((img, index) => {
    const src = imageSrc(liveImages[index]);
    if (src) img.setAttribute('src', src);
    else img.replaceWith(clone.ownerDocument.createTextNode(img.getAttribute('alt') ?? ''));
  });

  // 다이어그램: 그림이 그려져 있으면 그림만 남기고, 못 그렸으면(오류/빈 내용) 원본 코드를 보여 준다.
  for (const diagram of clone.querySelectorAll<HTMLElement>('.markwiz-diagram')) {
    if (diagram.querySelector('.markwiz-diagram-svg svg')) {
      diagram.querySelector('.markwiz-diagram-source')?.remove();
      diagram.querySelector('.markwiz-diagram-preview')?.classList.remove('markwiz-hidden');
    } else {
      diagram.querySelector('.markwiz-diagram-preview')?.remove();
      diagram.querySelector('.markwiz-diagram-source')?.classList.remove('markwiz-hidden');
    }
  }

  clone.querySelectorAll(REMOVE_SELECTOR).forEach((el) => el.remove());
  clone.querySelectorAll('.markwiz-hidden').forEach((el) => el.remove());

  // 체크박스 목록: 체크 여부는 DOM 프로퍼티라 복제되지 않으므로 원본 상태를 속성으로 옮기고 읽기 전용으로 만든다.
  const liveBoxes = [...live.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')];
  [...clone.querySelectorAll<HTMLInputElement>('input[type="checkbox"]')].forEach((input, index) => {
    input.toggleAttribute('checked', Boolean(liveBoxes[index]?.checked));
    input.setAttribute('disabled', '');
    // tiptap이 스크린 리더용으로 label 안에 넣는 숨김 문구(input의 aria-label과 같은 내용)는 필요 없다.
    input.closest('label')?.querySelectorAll(':scope > span').forEach((el) => el.remove());
  });

  for (const el of [clone, ...clone.querySelectorAll<HTMLElement>('*')]) {
    for (const name of STRIP_ATTRIBUTES) el.removeAttribute(name);
    const kept = [...el.classList].filter((name) => !name.startsWith('ProseMirror') && !STRIP_CLASSES.has(name));
    if (kept.length) el.setAttribute('class', kept.join(' '));
    else el.removeAttribute('class');
  }

  return clone;
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// 쪽 모양은 화면의 종이(A4 폭 794px, 안쪽 여백 72px)와 같게 하고, 인쇄할 때는 0.75in 여백으로 줄바꿈이 같게 맞춘다.
const PAGE_CSS = `
html { background: #faf9f5; }
body { margin: 0; padding: 24px 16px; }
.markwiz-page { box-sizing: border-box; max-width: 794px; margin: 0 auto; padding: 72px; background: #fff; border: 1px solid #ddd9cc; box-shadow: 0 1px 3px rgba(61, 57, 41, 0.12); }
@media (max-width: 860px) { .markwiz-page { padding: 24px; } }
@page { margin: 0.75in; @top-left { content: ''; } @top-center { content: ''; } @top-right { content: ''; } @bottom-left { content: ''; } @bottom-center { content: ''; } @bottom-right { content: ''; } }
@media print {
  html { background: #fff; }
  body { padding: 0; }
  .markwiz-page { max-width: none; padding: 0; border: 0; box-shadow: none; }
}
`;

export interface HtmlDocumentOptions {
  title: string;
  lang: string;
  // 문서 타이포그래피 스타일(src/styles/editor.css)
  css: string;
  body: string;
}

export function buildHtmlDocument({ title, lang, css, body }: HtmlDocumentOptions): string {
  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="generator" content="Markwiz">
<title>${escapeHtml(title)}</title>
<style>
${css}
${PAGE_CSS}</style>
</head>
<body>
<div class="markwiz-page">
<div class="ProseMirror">
${body}
</div>
</div>
</body>
</html>
`;
}
