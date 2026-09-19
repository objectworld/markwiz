import { DOMImplementation, DOMParser, XMLSerializer } from '@xmldom/xmldom';

interface Context2D {
  font: string;
  measureText(text: string): { width: number; fontBoundingBoxAscent?: number; fontBoundingBoxDescent?: number };
}

interface CanvasLike {
  getContext(type: '2d'): unknown;
}

type MeasurableElement = {
  style: Record<string, string>;
  getBBox(): { x: number; y: number; width: number; height: number };
};

// @plantuml/core(TeaVM)는 Java의 DOM/텍스트 측정 호출을 브라우저 전역에 그대로 위임한다:
//  - SVG 조립: document.createElementNS, ownerDocument.createProcessingInstruction, XMLSerializer, DOMParser
//  - 텍스트 폭 측정: document.createElement('canvas').measureText, <svg><text>.getBBox()
// Web Worker에는 이것들이 전혀 없다. 엔진을 워커에서 돌리기 위해, SVG 조립은 순수 JS XML DOM
// (xmldom)으로, 측정은 워커에서도 쓸 수 있는 OffscreenCanvas로 대체해 메인 스레드와 같은
// 폰트 메트릭을 얻는다.
export function installWorkerDomShims(
  scope: Record<string, unknown> = globalThis as unknown as Record<string, unknown>,
  createCanvas: () => CanvasLike = () => new OffscreenCanvas(1, 1),
): void {
  if (scope.document) return;

  const xmlDocument = new DOMImplementation().createDocument(null, '', null);

  // getBBox()를 canvas.measureText로 계산하는 측정용 속성을 요소에 붙인다.
  const makeMeasurable = <T extends object>(element: T): T & MeasurableElement => {
    const target = element as T & MeasurableElement & { getAttribute(name: string): string | null };
    target.style = {};
    target.getBBox = () => {
      const context = createCanvas().getContext('2d') as Context2D;
      const size = Number.parseFloat(target.getAttribute('font-size') ?? '14') || 14;
      context.font = `${size}px ${target.getAttribute('font-family') ?? 'sans-serif'}`;
      const metrics = context.measureText((target as unknown as { textContent: string }).textContent ?? '');
      const ascent = metrics.fontBoundingBoxAscent ?? size * 0.8;
      const descent = metrics.fontBoundingBoxDescent ?? size * 0.2;
      return { x: 0, y: -ascent, width: metrics.width, height: ascent + descent };
    };
    return target;
  };

  const shimDocument = Object.create(xmlDocument) as Record<string, unknown>;
  shimDocument.body = makeMeasurable(xmlDocument.createElementNS('http://www.w3.org/1999/xhtml', 'body'));
  shimDocument.createElementNS = (namespace: string | null, name: string) =>
    makeMeasurable(xmlDocument.createElementNS(namespace, name));
  shimDocument.createElement = (tag: string) => (tag === 'canvas' ? createCanvas() : makeMeasurable(xmlDocument.createElement(tag)));
  shimDocument.getElementById = () => null;

  scope.window ??= scope;
  scope.document = shimDocument;
  scope.DOMParser ??= DOMParser;
  scope.XMLSerializer ??= XMLSerializer;
}
