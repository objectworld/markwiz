import { afterEach, describe, expect, it, vi } from 'vitest';
import { clampImageSize, dataUrlToBytes, rasterizeImage, rasterizeSvg } from './rasterize';

describe('clampImageSize', () => {
  it('keeps images under the max width unchanged', () => {
    expect(clampImageSize(300, 150)).toEqual({ width: 300, height: 150 });
  });

  it('scales down proportionally when wider than the max', () => {
    expect(clampImageSize(1200, 600)).toEqual({ width: 600, height: 300 });
  });

  it('falls back to a 1x1 size for degenerate input', () => {
    expect(clampImageSize(0, 0)).toEqual({ width: 1, height: 1 });
    expect(clampImageSize(-10, 20)).toEqual({ width: 1, height: 1 });
  });
});

describe('dataUrlToBytes', () => {
  it('decodes the base64 payload of a data URL', () => {
    // "hi" 를 base64로 인코딩한 값
    const bytes = dataUrlToBytes('data:text/plain;base64,aGk=');
    expect(String.fromCharCode(...bytes)).toBe('hi');
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('rasterizeImage', () => {
  it('returns null for an image that has not finished loading', () => {
    const img = { complete: false, naturalWidth: 0 } as HTMLImageElement;
    expect(rasterizeImage(img)).toBeNull();
  });

  it('returns null when the canvas has no 2D context (e.g. no canvas support)', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
    const img = { complete: true, naturalWidth: 100, naturalHeight: 50 } as HTMLImageElement;
    expect(rasterizeImage(img)).toBeNull();
  });

  it('returns null when drawing taints the canvas (cross-origin image without CORS)', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage: vi.fn(() => {
        throw new DOMException('tainted', 'SecurityError');
      }),
    } as unknown as CanvasRenderingContext2D);
    const img = { complete: true, naturalWidth: 100, naturalHeight: 50 } as HTMLImageElement;
    expect(rasterizeImage(img)).toBeNull();
  });

  it('draws the image and returns clamped PNG bytes on success', () => {
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ drawImage } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,aGk=');

    const img = { complete: true, naturalWidth: 1200, naturalHeight: 600 } as HTMLImageElement;
    const result = rasterizeImage(img);

    expect(drawImage).toHaveBeenCalledWith(img, 0, 0);
    expect(result).toEqual({ data: dataUrlToBytes('data:image/png;base64,aGk='), width: 600, height: 300 });
  });
});

// jsdom은 실제로 이미지를 로드하지 않으므로 Image를 직접 흉내 낸 뒤 onload/onerror를 수동으로 실행한다.
function stubImageLoad(succeed: boolean) {
  class FakeImage {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    set src(_value: string) {
      queueMicrotask(() => (succeed ? this.onload : this.onerror)?.());
    }
  }
  vi.stubGlobal('Image', FakeImage);
}

// XMLSerializer는 실제 DOM 노드를 요구하므로(순수 객체로는 흉내낼 수 없다) 진짜 svg 엘리먼트를 만들고
// jsdom이 항상 0을 돌려주는 크기 측정만 오버라이드한다.
function fakeSvg(width: number, height: number): SVGSVGElement {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg') as SVGSVGElement;
  svg.getBoundingClientRect = () => ({ width, height }) as DOMRect;
  return svg;
}

describe('rasterizeSvg', () => {
  it('returns null when the svg has no rendered size', async () => {
    await expect(rasterizeSvg(fakeSvg(0, 0))).resolves.toBeNull();
  });

  it('returns null when the serialized svg fails to load as an image', async () => {
    stubImageLoad(false);
    await expect(rasterizeSvg(fakeSvg(100, 50))).resolves.toBeNull();
  });

  it('fills a white background and draws the svg at the given scale', async () => {
    stubImageLoad(true);
    const fillRect = vi.fn();
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillRect,
      drawImage,
      fillStyle: '',
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,aGk=');

    const result = await rasterizeSvg(fakeSvg(100, 50), 2);

    expect(fillRect).toHaveBeenCalledWith(0, 0, 200, 100);
    expect(drawImage).toHaveBeenCalledWith(expect.anything(), 0, 0, 200, 100);
    expect(result).toEqual({ data: dataUrlToBytes('data:image/png;base64,aGk='), width: 100, height: 50 });
  });
});
