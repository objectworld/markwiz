import type { Editor } from '@tiptap/core';
import { executeCommand } from '../commands/registry';
import { getViewState, showNotice } from '../commands/viewState';
import { t } from '../i18n/i18n';

// PDF 내보내기는 별도 라이브러리 없이 브라우저/웹뷰의 인쇄 기능을 그대로 쓴다 — 실제 벡터 텍스트와
// 이미 그려진 다이어그램(SVG)을 그대로 살리면서, 인쇄 대화상자에서 "PDF로 저장"(Windows는
// "Microsoft Print to PDF")을 고르면 된다. 인쇄용 화면 구성은 src/styles/editor.css의
// @media print 규칙이 맡는다(리본/메뉴/사이드바/상태바 숨김, 다이어그램은 항상 미리보기로 등).
export function exportPdf(editor: Editor): void {
  // 소스 코드 모드에서는 편집기 DOM이 숨겨져 있어(그 자리를 textarea가 대신함) 인쇄하면 빈 페이지만 나온다.
  // 미리보기로 돌아간 뒤 인쇄한다 — 변환에 실패하면(문법 오류) 중단하고 알린다.
  if (getViewState().sourceMode) {
    executeCommand('view.sourceMode', editor);
    if (getViewState().sourceMode) {
      showNotice(t('notice.pdfSourceError'));
      return;
    }
  }

  window.print();
}
