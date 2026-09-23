import { getSchema } from '@tiptap/core';
import type { Node as ProseMirrorNode, Schema } from '@tiptap/pm/model';
import * as docx from 'docx';
import JSZip from 'jszip';
import { describe, expect, it } from 'vitest';
import { editorExtensions } from '../editor/extensions';
import { parseMarkdown } from '../markdown/parser';
import { convertDocument, createConvertContext, type ConvertContext } from './docxConvert';
import type { RasterImage } from './rasterize';

const schema: Schema = getSchema(editorExtensions);

// 1x1 흰 픽셀 PNG. 진짜 PNG 헤더를 갖춰야 docx가 이미지로 인식해 미디어 파일로 담는다.
const FAKE_PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
  ),
  (c) => c.charCodeAt(0),
);
const FAKE_IMAGE: RasterImage = { data: FAKE_PNG, width: 10, height: 10 };

// 문서에 등장하는 image/mermaid/plantuml 노드 위치를 실제로 찾아 이미지를 채워 넣는다(위치를 손으로
// 세지 않기 위해). `withoutRasterAt`에 넣은 순번(0부터)의 위치는 일부러 null로 남겨 대체 텍스트 경로를 검증한다.
function imagesFor(doc: ProseMirrorNode, withoutRasterAt: number[] = []): Map<number, RasterImage | null> {
  const images = new Map<number, RasterImage | null>();
  let index = 0;
  doc.descendants((node, pos) => {
    const isDiagram = node.type.name === 'codeBlock' && (node.attrs.language === 'mermaid' || node.attrs.language === 'plantuml');
    if (node.type.name === 'image' || isDiagram) {
      images.set(pos, withoutRasterAt.includes(index) ? null : FAKE_IMAGE);
      index += 1;
    }
  });
  return images;
}

async function build(
  markdown: string,
  withoutRasterAt: number[] = [],
): Promise<{ xml: string; footnotesXml: string | null; numberingXml: string | null; ctx: ConvertContext }> {
  const doc = parseMarkdown(schema, markdown.trim());
  const ctx = createConvertContext(docx, imagesFor(doc, withoutRasterAt));
  const { blocks, numberingConfigs } = convertDocument(doc, ctx);

  const file = new docx.Document({
    numbering: numberingConfigs.length ? { config: numberingConfigs } : undefined,
    footnotes: Object.keys(ctx.footnotes).length ? ctx.footnotes : undefined,
    sections: [{ children: blocks }],
  });

  const buffer = await docx.Packer.toBuffer(file);
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file('word/document.xml')!.async('text');
  const footnotesXml = (await zip.file('word/footnotes.xml')?.async('text')) ?? null;
  const numberingXml = (await zip.file('word/numbering.xml')?.async('text')) ?? null;
  return { xml, footnotesXml, numberingXml, ctx };
}

describe('docx export: text and marks', () => {
  it('renders headings with Word heading styles', async () => {
    const { xml } = await build('# 제목 1\n\n## 제목 2\n\n###### 제목 6');
    expect(xml).toContain('w:val="Heading1"');
    expect(xml).toContain('w:val="Heading2"');
    expect(xml).toContain('w:val="Heading6"');
    expect(xml).toContain('제목 1');
  });

  it('renders bold/italic/strike/code marks', async () => {
    const { xml } = await build('**굵게** _기울임_ ~~취소선~~ `코드`');
    expect(xml).toContain('<w:b/>');
    expect(xml).toContain('<w:i/>');
    expect(xml).toContain('<w:strike/>');
    expect(xml).toContain('Consolas');
  });

  it('renders links as real hyperlinks', async () => {
    const { xml } = await build('[마크위즈](https://example.com)');
    expect(xml).toContain('hyperlink');
    expect(xml).toContain('마크위즈');
  });

  it('renders a horizontal rule as a bordered empty paragraph', async () => {
    const { xml } = await build('앞\n\n---\n\n뒤');
    expect(xml).toContain('<w:bottom');
  });
});

describe('docx export: lists', () => {
  it('gives bullet and ordered lists their own numbering (independent restart)', async () => {
    const { xml, numberingXml, ctx } = await build('- a\n- b\n\n1. x\n2. y');
    expect(ctx.listConfigs).toHaveLength(2);
    expect(ctx.listConfigs[0].reference).not.toBe(ctx.listConfigs[1].reference);
    expect(numberingXml).toContain('bullet');
    expect(numberingXml).toContain('decimal');
    expect(xml).toContain('numId');
  });

  it('keeps two separate bullet lists as two independent numbering instances', async () => {
    const { ctx } = await build('- a\n- b\n\n본문\n\n- c\n- d');
    expect(ctx.listConfigs).toHaveLength(2);
  });

  it('nests a sub-list under the same reference at the next level', async () => {
    const { xml, ctx } = await build('- a\n  - a1\n  - a2\n- b');
    expect(ctx.listConfigs).toHaveLength(1);
    expect(xml).toContain('w:val="0"'); // top level
    expect(xml).toContain('w:val="1"'); // nested level
  });

  it('marks task items with a checkbox glyph instead of native numbering', async () => {
    const { xml, ctx } = await build('- [ ] todo\n- [x] done');
    expect(xml).toContain('☐'); // ☐
    expect(xml).toContain('☑'); // ☑
    expect(ctx.listConfigs).toHaveLength(0); // 체크박스는 numbering을 쓰지 않는다
  });
});

describe('docx export: blockquote, code block, table', () => {
  it('gives blockquote paragraphs a left border', async () => {
    const { xml } = await build('> 인용문입니다');
    expect(xml).toContain('<w:left');
    expect(xml).toContain('인용문입니다');
  });

  it('renders a plain code block as monospace text, line by line', async () => {
    const { xml } = await build('```ts\nconst a = 1;\nconst b = 2;\n```');
    expect(xml).toContain('Consolas');
    expect(xml).toContain('const a = 1;');
    expect(xml).toContain('const b = 2;');
  });

  it('renders a table with a shaded header row', async () => {
    const { xml } = await build('| Name | Score |\n| --- | --- |\n| Alice | 1 |');
    expect(xml).toContain('<w:tbl>');
    expect(xml).toContain('Name');
    expect(xml).toContain('Alice');
    expect(xml).toContain('F3F3F3');
  });
});

describe('docx export: footnotes', () => {
  it('turns a footnote reference/definition pair into a native Word footnote', async () => {
    const { xml, footnotesXml } = await build('본문 주장[^1].\n\n[^1]: 근거입니다.');
    expect(xml).toContain('footnoteReference');
    expect(footnotesXml).toContain('근거입니다');
  });
});

describe('docx export: images and diagrams', () => {
  it('embeds a rasterized image and falls back to a text placeholder when rasterization failed', async () => {
    const { xml } = await build('![고양이](https://example.com/cat.png) 뒤 ![개](https://example.com/dog.png)', [1]);
    expect(xml).toContain('<w:drawing>');
    expect(xml).toContain('[image: 개]');
  });

  it('embeds a rendered diagram image, and shows the raw source when rendering had no output yet', async () => {
    const { xml } = await build('```mermaid\ngraph TD; A-->B;\n```\n\n```plantuml\nAlice -> Bob\n```', [1]);
    expect(xml).toContain('<w:drawing>');
    expect(xml).toContain('Alice -&gt; Bob'); // XML 이스케이프된 형태
  });
});

describe('docx export: empty document', () => {
  it('produces a valid (if empty) docx instead of throwing', async () => {
    const { xml } = await build('');
    expect(xml).toContain('<w:document');
  });
});
