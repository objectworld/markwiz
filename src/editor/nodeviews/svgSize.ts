export interface SvgSize {
  width: number;
  height: number;
}

// SVG 문자열의 본래 크기. viewBox가 있으면 그것을, 없으면 width/height 속성(px 숫자)을 쓴다.
// 확대/축소 배율을 곱할 기준 크기를 얻으려는 것이라 정확한 파싱까지는 필요 없고 여는 <svg> 태그만 본다.
export function svgNaturalSize(svg: string): SvgSize | null {
  const tag = /<svg\b[^>]*>/i.exec(svg)?.[0];
  if (!tag) return null;

  const attr = (name: string) => new RegExp(`\\s${name}\\s*=\\s*["']([^"']*)["']`, 'i').exec(tag)?.[1];

  const viewBox = attr('viewBox')?.trim().split(/[\s,]+/).map(Number);
  if (viewBox && viewBox.length === 4 && viewBox[2] > 0 && viewBox[3] > 0) {
    return { width: viewBox[2], height: viewBox[3] };
  }

  const width = parseFloat(attr('width') ?? '');
  const height = parseFloat(attr('height') ?? '');
  // 100%처럼 비율로 적힌 값은 크기가 아니다.
  if (width > 0 && height > 0 && !attr('width')?.includes('%') && !attr('height')?.includes('%')) return { width, height };
  return null;
}
