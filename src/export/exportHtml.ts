import type { Editor } from '@tiptap/core';
import { getDocumentState } from '../commands/documentState';
import { getViewState, showNotice } from '../commands/viewState';
import { getLanguage, t } from '../i18n/i18n';
import { getPlatform } from '../platform';
import editorCss from '../styles/editor.css?raw';
import { ensurePreviewMode } from './exportPdf';
import { buildHtmlDocument, cleanEditorDom } from './htmlConvert';
import { rasterizeImage } from './rasterize';
import { waitForRender } from './waitForRender';

const HTML_FILTER = { name: 'HTML', extensions: ['html'] };

function documentTitle(): string {
  return getDocumentState().name.replace(/\.(md|markdown)$/i, '');
}

function bytesToDataUrl(bytes: Uint8Array, mime: string): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return `data:${mime};base64,${btoa(binary)}`;
}

// 인터넷 주소(http/https)와 이미 data:인 이미지는 그대로 두고, 그 밖의 것(로컬 file/asset 주소, 상대 경로)은 파일을 옮겨도
// 보이도록 화면에 그려진 픽셀을 PNG data URL로 넣는다. 읽을 수 없으면(깨진 링크) null — 대체 텍스트로 남는다.
export function imageSrcForExport(img: HTMLImageElement): string | null {
  const src = img.getAttribute('src') ?? '';
  if (/^(https?:|data:)/i.test(src)) return src;
  const raster = rasterizeImage(img);
  return raster ? bytesToDataUrl(raster.data, 'image/png') : null;
}

export function renderHtmlDocument(editor: Editor): string {
  const clone = cleanEditorDom(editor.view.dom as HTMLElement, { imageSrc: imageSrcForExport });
  return buildHtmlDocument({ title: documentTitle(), lang: getLanguage(), css: editorCss, body: clone.innerHTML });
}

export async function exportHtml(editor: Editor): Promise<void> {
  const wasSourceMode = getViewState().sourceMode;
  if (!ensurePreviewMode(editor, 'notice.htmlSourceError')) return;
  await waitForRender(editor.view.dom as HTMLElement, { settle: wasSourceMode });

  const html = renderHtmlDocument(editor);
  const platform = await getPlatform();
  const saved = await platform.saveBinaryFileAs(new TextEncoder().encode(html), `${documentTitle()}.html`, HTML_FILTER);
  if (saved) showNotice(t('notice.htmlSaved', { name: saved.name }));
}
