import '@testing-library/jest-dom/vitest';

// jsdom은 레이아웃을 계산하지 않아 SVGElement.getBBox()가 없다. mermaid가
// 다이어그램 크기를 측정할 때 이 메서드를 호출하므로, 테스트에서는 더미 값을
// 반환하도록 채워 넣는다.
if (typeof SVGElement !== 'undefined') {
  const svgProto = SVGElement.prototype as unknown as { getBBox?: () => DOMRect };
  if (!svgProto.getBBox) {
    svgProto.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 }) as DOMRect;
  }
}


// jsdom의 Range에는 getClientRects/getBoundingClientRect가 없다. ProseMirror는 커서 위치를 스크롤로 맞출 때
// (Tiptap focus() -> scrollIntoView) 이를 호출하는데, 테스트가 끝난 뒤 늦게 실행되면 처리되지 않은
// 예외로 vitest가 실패한다. 레이아웃이 없는 환경이므로 빈 값을 돌려준다.
if (typeof Range !== 'undefined') {
  const rangeProto = Range.prototype as unknown as {
    getClientRects?: () => DOMRectList;
    getBoundingClientRect?: () => DOMRect;
  };
  if (!rangeProto.getClientRects) {
    rangeProto.getClientRects = () => ({ length: 0, item: () => null, [Symbol.iterator]: function* () {} }) as unknown as DOMRectList;
  }
  if (!rangeProto.getBoundingClientRect) {
    rangeProto.getBoundingClientRect = () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 }) as DOMRect;
  }
}

// 테스트는 한국어 UI를 기준으로 쓰여 있다. jsdom의 기본 언어는 en-US라 앱이 영어로 시작하므로 명시적으로 고정하고,
// 언어를 바꾸는 테스트가 다음 테스트에 새지 않게 매번 되돌린다.
import { afterEach } from 'vitest';
import { setLanguage } from '../i18n/i18n';

setLanguage('ko', { persist: false });
afterEach(() => setLanguage('ko', { persist: false }));
