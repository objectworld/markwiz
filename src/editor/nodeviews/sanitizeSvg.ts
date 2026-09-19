import DOMPurify from 'dompurify';

// PlantUML은 mermaid와 달리 자체 sanitize 옵션이 없고, [[javascript:...]] 같은 링크나
// 외부 참조가 SVG에 그대로 실릴 수 있다. 신뢰할 수 없는 .md 파일을 열어도 스크립트가
// 실행되지 않도록 dangerouslySetInnerHTML 직전에 반드시 걸러낸다.
export function sanitizeSvg(svg: string): string {
  return DOMPurify.sanitize(svg, { USE_PROFILES: { svg: true, svgFilters: true } });
}
