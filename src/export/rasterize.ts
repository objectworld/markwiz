// 이미지/다이어그램을 Word(.docx)에 넣으려면 픽셀 데이터(PNG)가 필요하다. 이미 화면에 그려진 <img>와
// 다이어그램 <svg>를 캔버스에 그려서 얻는다 — 별도 네트워크 요청 없이 이미 로드된 픽셀을 재사용하는 방식이라
// CSP `connect-src`와 무관하고, `file://`/`asset://`/`data:` 로컬 이미지에서도 그대로 동작한다.
// 단, 교차 출처(외부 https:) 이미지는 서버가 CORS를 허용하지 않으면 캔버스가 "오염"되어 픽셀을 읽을 수 없다
// (브라우저 보안 제약 — 우회할 방법이 없다). 이 경우 호출자가 텍스트 대체 문구로 대신한다.

export interface RasterImage {
  data: Uint8Array;
  width: number;
  height: number;
}

// 문서에 큰 이미지를 그대로 넣으면 페이지 폭을 넘어서므로, 가로 방향으로만 이 값(px, 96dpi 기준 약 6.25in)을
// 넘지 않게 비율을 유지하며 줄인다.
export const MAX_IMAGE_WIDTH = 600;

export function clampImageSize(width: number, height: number, maxWidth = MAX_IMAGE_WIDTH): { width: number; height: number } {
  if (width <= 0 || height <= 0) return { width: 1, height: 1 };
  if (width <= maxWidth) return { width: Math.round(width), height: Math.round(height) };
  const scale = maxWidth / width;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

// 화면에 이미 로드된 <img>를 캔버스에 그려 PNG 바이트로 만든다. 아직 로드되지 않았거나(깨진 링크),
// 교차 출처 이미지라 캔버스가 오염되면 null을 돌려준다.
export function rasterizeImage(img: HTMLImageElement): RasterImage | null {
  if (!img.complete || img.naturalWidth === 0) return null;

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  try {
    ctx.drawImage(img, 0, 0);
    const { width, height } = clampImageSize(img.naturalWidth, img.naturalHeight);
    return { data: dataUrlToBytes(canvas.toDataURL('image/png')), width, height };
  } catch {
    return null;
  }
}

// 렌더링된 다이어그램 <svg>를 래스터화한다. SVG는 배경이 투명하므로 흰 배경을 먼저 채우고,
// 인쇄/문서용으로 화면 표시 크기보다 선명하게(scale배) 그린다.
export async function rasterizeSvg(svg: SVGSVGElement, scale = 2): Promise<RasterImage | null> {
  const rect = svg.getBoundingClientRect();
  if (!rect.width || !rect.height) return null;

  const xml = new XMLSerializer().serializeToString(svg);
  const image = new Image();
  const loaded = new Promise<boolean>((resolve) => {
    image.onload = () => resolve(true);
    image.onerror = () => resolve(false);
  });
  // base64 대신 URI 인코딩을 쓰면 SVG 안의 한글 등 비 Latin-1 문자에서 btoa가 실패하는 문제를 피할 수 있다.
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  if (!(await loaded)) return null;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(rect.width * scale);
  canvas.height = Math.round(rect.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  try {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const { width, height } = clampImageSize(rect.width, rect.height);
    return { data: dataUrlToBytes(canvas.toDataURL('image/png')), width, height };
  } catch {
    return null;
  }
}
