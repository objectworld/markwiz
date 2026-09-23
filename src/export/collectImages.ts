import type { Editor } from '@tiptap/core';
import { rasterizeImage, rasterizeSvg, type RasterImage } from './rasterize';

// 문서를 훑으며 이미지 노드와 다이어그램(mermaid/plantuml) 코드블록의 위치(pos)를 찾고, 이미 화면에
// 렌더링된 실제 DOM(editor.view.nodeDOM)에서 픽셀을 읽어 온다. Word 문서 트리를 만들기 전에 이 작업을
// 먼저 끝내 두면(비동기), 트리 생성 자체는 동기 함수로 단순하게 유지할 수 있다.
export async function collectRasterImages(editor: Editor): Promise<Map<number, RasterImage | null>> {
  const results = new Map<number, RasterImage | null>();
  const jobs: Promise<void>[] = [];

  editor.state.doc.descendants((node, pos) => {
    if (node.type.name === 'image') {
      const dom = editor.view.nodeDOM(pos);
      const img = dom instanceof HTMLImageElement ? dom : (dom as HTMLElement | null)?.querySelector?.('img');
      results.set(pos, img ? rasterizeImage(img) : null);
      return true;
    }

    if (node.type.name === 'codeBlock' && (node.attrs.language === 'mermaid' || node.attrs.language === 'plantuml')) {
      const dom = editor.view.nodeDOM(pos) as HTMLElement | null;
      const svg = dom?.querySelector<SVGSVGElement>('.markwiz-diagram-svg svg');
      if (svg) {
        jobs.push(
          rasterizeSvg(svg).then((raster) => {
            results.set(pos, raster);
          }),
        );
      } else {
        results.set(pos, null);
      }
      return false; // 코드블록 내부(raw 텍스트)는 더 훑을 필요 없다.
    }

    return true;
  });

  await Promise.all(jobs);
  return results;
}
