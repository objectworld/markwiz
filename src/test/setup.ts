import '@testing-library/jest-dom/vitest';

// jsdom은 레이아웃을 계산하지 않아 SVGElement.getBBox()가 없다. mermaid가
// 다이어그램 크기를 측정할 때 이 메서드를 호출하므로, 테스트에서는 더미 값을
// 반환하도록 채워 넣는다.
const svgProto = SVGElement.prototype as unknown as { getBBox?: () => DOMRect };
if (typeof SVGElement !== 'undefined' && !svgProto.getBBox) {
  svgProto.getBBox = () => ({ x: 0, y: 0, width: 0, height: 0, top: 0, right: 0, bottom: 0, left: 0 }) as DOMRect;
}

