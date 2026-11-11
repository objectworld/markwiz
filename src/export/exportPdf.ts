import type { Editor } from '@tiptap/core';
import { executeCommand } from '../commands/registry';
import { getViewState, showNotice } from '../commands/viewState';
import { t } from '../i18n/i18n';
import type { MessageKey } from '../i18n/messages';
import { waitForRender } from './waitForRender';

// 소스 코드 모드에서는 편집기 DOM이 숨겨져 있어(그 자리를 textarea가 대신함) 인쇄하거나 HTML로 내보내면 빈 문서만 나온다.
// 미리보기로 돌아간 뒤 진행한다 — 변환에 실패하면(문법 오류) false를 돌려주고 errorKey 안내를 띄운다.
export function ensurePreviewMode(editor: Editor, errorKey: MessageKey): boolean {
  if (!getViewState().sourceMode) return true;
  executeCommand('view.sourceMode', editor);
  if (!getViewState().sourceMode) return true;
  showNotice(t(errorKey));
  return false;
}

// 인쇄는 브라우저/웹뷰의 인쇄 기능을 그대로 쓴다 — 실제 벡터 텍스트와 이미 그려진 다이어그램(SVG)을 그대로 살린다.
// 인쇄용 화면 구성은 src/styles/editor.css의 @media print 규칙이 맡는다(리본/메뉴/사이드바/상태바 숨김,
// 다이어그램은 항상 미리보기로 등). 소스 모드에서 돌아온 직후라면 NodeView가 그려진 뒤에 인쇄한다
// (이미 미리보기 상태면 지연 없이 바로 인쇄 — window.print는 동기 호출이다).
function printWhenReady(editor: Editor, errorKey: MessageKey): void {
  const wasSourceMode = getViewState().sourceMode;
  if (!ensurePreviewMode(editor, errorKey)) return;
  if (!wasSourceMode) {
    window.print();
    return;
  }
  void waitForRender(editor.view.dom as HTMLElement, { settle: true }).then(() => window.print());
}

export function printDocument(editor: Editor): void {
  printWhenReady(editor, 'notice.printSourceError');
}

// PDF 파일은 같은 인쇄 대화상자에서 "PDF로 저장"(Windows는 "Microsoft Print to PDF")을 골라 만든다.
export function exportPdf(editor: Editor): void {
  printWhenReady(editor, 'notice.pdfSourceError');
}
