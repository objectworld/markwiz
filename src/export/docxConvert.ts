import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import type {
  ILevelsOptions,
  IParagraphOptions,
  Paragraph as ParagraphType,
  ParagraphChild,
  Table as TableType,
  TableCell as TableCellType,
  TableRow as TableRowType,
  TextRun as TextRunType,
} from 'docx';
import type { RasterImage } from './rasterize';

// docx는 무겁기 때문에(PlantUML과 같은 이유로) 앱 초기 로드에 포함하지 않고 실제로 Word 내보내기를
// 실행할 때만 동적 import한다(exportDocx.ts). 이 모듈은 그 결과로 얻은 값들(클래스/enum)을
// ConvertContext에 주입받아 쓴다 — 여기서 `import { Paragraph } from 'docx'`처럼 정적으로 값을
// 가져오면 이 파일을 참조하는 순간 docx 전체가 번들에 딸려 들어온다.
export type DocxLib = typeof import('docx');

// Word 자체가 지원하는 목록 최대 깊이(0-indexed 9단계)에 맞춘다. 그보다 깊은 중첩은 마지막 단계 서식을
// 재사용한다(들여쓰기만 더 깊어지고 글머리/번호 모양은 반복됨) — 실제 문서에서 거의 나오지 않는 경우다.
const MAX_LIST_LEVEL = 8;
const INDENT_PER_LEVEL = 720; // twip, 0.5인치
const HANGING_INDENT = 360; // twip, 0.25인치

const BULLET_GLYPHS = ['•', '◦', '▪']; // •, ◦, ▪ — Word 기본 글머리 순환과 비슷하게 반복
const CHECKBOX_CHECKED = '☑'; // ☑
const CHECKBOX_UNCHECKED = '☐'; // ☐

function levelStyle(level: number) {
  return { paragraph: { indent: { left: (level + 1) * INDENT_PER_LEVEL, hanging: HANGING_INDENT } } };
}

function bulletLevels(docx: DocxLib): ILevelsOptions[] {
  return Array.from({ length: MAX_LIST_LEVEL + 1 }, (_, level) => ({
    level,
    format: docx.LevelFormat.BULLET,
    text: BULLET_GLYPHS[level % BULLET_GLYPHS.length],
    alignment: docx.AlignmentType.LEFT,
    style: levelStyle(level),
  }));
}

function decimalLevels(docx: DocxLib): ILevelsOptions[] {
  // 멀티 레벨(1.1.1 같은) 번호 대신 각 단계가 독립적으로 1부터 세는 단순한 방식을 쓴다 — 마크다운
  // orderedList 자체가 중첩 단계 간 번호 연동을 요구하지 않기 때문에 이 정도로 충분하다.
  return Array.from({ length: MAX_LIST_LEVEL + 1 }, (_, level) => ({
    level,
    format: docx.LevelFormat.DECIMAL,
    text: `%${level + 1}.`,
    alignment: docx.AlignmentType.LEFT,
    style: levelStyle(level),
  }));
}

export interface ListNumberingConfig {
  reference: string;
  levels: ILevelsOptions[];
}

type DocxBlock = ParagraphType | TableType;

export interface ConvertContext {
  docx: DocxLib;
  // <img>/다이어그램 <svg>를 미리 래스터화해 문서 내 위치(ProseMirror pos)로 찾아볼 수 있게 한 맵.
  // 값이 null이면 래스터화에 실패한 것(다른 출처 이미지 등) — 텍스트로 대신 표시한다.
  images: Map<number, RasterImage | null>;
  footnotes: Record<string, { children: ParagraphType[] }>;
  // 목록마다 새 번호 매기기 인스턴스를 만들어야 서로 다른 목록이 번호를 이어받지 않는다(docx 라이브러리는
  // 같은 reference를 쓰면 기본적으로 카운터를 공유한다). 최상위 목록에 진입할 때만 새로 만들고,
  // 중첩된 하위 목록은 부모의 reference를 그대로 물려받아 한 목록으로 이어진다.
  listRef: string | null;
  listDepth: number;
  // 인용구(blockquote) 안의 문단에는 왼쪽 테두리 + 들여쓰기를 준다. 중첩 인용은 깊이만큼 들여쓴다.
  quoteDepth: number;
  listConfigs: ListNumberingConfig[];
  nextListId: { value: number };
}

export function createConvertContext(docx: DocxLib, images: Map<number, RasterImage | null>): ConvertContext {
  return {
    docx,
    images,
    footnotes: {},
    listRef: null,
    listDepth: 0,
    quoteDepth: 0,
    listConfigs: [],
    nextListId: { value: 0 },
  };
}

function allocateListRef(ctx: ConvertContext, kind: 'bullet' | 'decimal'): string {
  const reference = `markwiz-list-${ctx.nextListId.value}`;
  ctx.nextListId.value += 1;
  ctx.listConfigs.push({ reference, levels: kind === 'bullet' ? bulletLevels(ctx.docx) : decimalLevels(ctx.docx) });
  return reference;
}

function quoteParagraphStyle(ctx: ConvertContext): Pick<IParagraphOptions, 'border' | 'indent'> {
  if (ctx.quoteDepth === 0) return {};
  return {
    border: { left: { style: ctx.docx.BorderStyle.SINGLE, size: 12, space: 8, color: 'E3C9BC' } },
    indent: { left: ctx.quoteDepth * 360 },
  };
}

function headingLevel(docx: DocxLib, level: number) {
  const levels = [
    docx.HeadingLevel.HEADING_1,
    docx.HeadingLevel.HEADING_2,
    docx.HeadingLevel.HEADING_3,
    docx.HeadingLevel.HEADING_4,
    docx.HeadingLevel.HEADING_5,
    docx.HeadingLevel.HEADING_6,
  ] as const;
  return levels[Math.min(Math.max(level - 1, 0), levels.length - 1)];
}

function imagePlaceholder(docx: DocxLib, node: ProseMirrorNode): TextRunType {
  const label = (node.attrs.alt as string) || (node.attrs.src as string) || 'image';
  return new docx.TextRun({ text: `[image: ${label}]`, italics: true });
}

// parent의 인라인 콘텐츠(텍스트 + 마크 + 각주 참조 + 이미지)를 docx 런으로 바꾼다.
// contentStart는 parent 내부 콘텐츠의 ProseMirror 위치(= parent가 있는 위치 + 1)다.
function convertInline(parent: ProseMirrorNode, contentStart: number, ctx: ConvertContext): ParagraphChild[] {
  const { docx } = ctx;
  const runs: ParagraphChild[] = [];
  parent.forEach((child, offset) => {
    const pos = contentStart + offset;

    if (child.type.name === 'footnoteReference') {
      const id = Number(child.attrs.id);
      if (!Number.isNaN(id)) runs.push(new docx.FootnoteReferenceRun(id));
      return;
    }
    if (child.type.name === 'hardBreak') {
      runs.push(new docx.TextRun({ text: '', break: 1 }));
      return;
    }
    if (child.type.name === 'image') {
      const raster = ctx.images.get(pos);
      runs.push(
        raster
          ? new docx.ImageRun({ type: 'png', data: raster.data, transformation: { width: raster.width, height: raster.height } })
          : imagePlaceholder(docx, child),
      );
      return;
    }
    if (!child.isText) return;

    const isLink = child.marks.find((mark) => mark.type.name === 'link');
    const isCode = child.marks.some((mark) => mark.type.name === 'code');
    const run = new docx.TextRun({
      text: child.text ?? '',
      bold: child.marks.some((mark) => mark.type.name === 'bold'),
      italics: child.marks.some((mark) => mark.type.name === 'italic'),
      strike: child.marks.some((mark) => mark.type.name === 'strike'),
      font: isCode ? 'Consolas' : undefined,
      shading: isCode ? { type: docx.ShadingType.CLEAR, color: 'auto', fill: 'F3F4F6' } : undefined,
    });
    runs.push(isLink ? new docx.ExternalHyperlink({ link: String(isLink.attrs.href), children: [run] }) : run);
  });
  return runs;
}

function convertCodeBlock(node: ProseMirrorNode, pos: number, ctx: ConvertContext): DocxBlock[] {
  const { docx } = ctx;
  const language = typeof node.attrs.language === 'string' ? node.attrs.language : '';
  if (language === 'mermaid' || language === 'plantuml') {
    const raster = ctx.images.get(pos);
    if (raster) {
      return [
        new docx.Paragraph({
          alignment: docx.AlignmentType.CENTER,
          spacing: { before: 120, after: 120 },
          children: [new docx.ImageRun({ type: 'png', data: raster.data, transformation: { width: raster.width, height: raster.height } })],
        }),
      ];
    }
    // 렌더링에 실패했거나(오류) 아직 렌더링 전이면 원본 다이어그램 코드를 코드 블록처럼 보여준다.
  }

  const lines = node.textContent.split('\n');
  const runs: TextRunType[] = lines.flatMap((line, i) =>
    i === 0
      ? [new docx.TextRun({ text: line, font: 'Consolas', size: 20 })]
      : [new docx.TextRun({ text: line, font: 'Consolas', size: 20, break: 1 })],
  );
  return [
    new docx.Paragraph({
      children: runs,
      shading: { type: docx.ShadingType.CLEAR, color: 'auto', fill: 'F6F8FA' },
      spacing: { before: 120, after: 120 },
    }),
  ];
}

function convertTable(node: ProseMirrorNode, pos: number, ctx: ConvertContext): DocxBlock[] {
  const { docx } = ctx;
  const rows: TableRowType[] = [];
  let contentStart = pos + 1;
  node.forEach((row) => {
    const rowContentStart = contentStart + 1;
    const cells: TableCellType[] = [];
    let cellStart = rowContentStart;
    row.forEach((cell) => {
      const isHeader = cell.type.name === 'tableHeader';
      const children: DocxBlock[] = [];
      let childStart = cellStart + 1;
      cell.forEach((child) => {
        children.push(...convertBlock(child, childStart, ctx));
        childStart += child.nodeSize;
      });
      cells.push(
        new docx.TableCell({
          children: children.length ? children : [new docx.Paragraph({})],
          shading: isHeader ? { type: docx.ShadingType.CLEAR, color: 'auto', fill: 'F3F3F3' } : undefined,
          width: { size: 100 / Math.max(row.childCount, 1), type: docx.WidthType.PERCENTAGE },
        }),
      );
      cellStart += cell.nodeSize;
    });
    rows.push(new docx.TableRow({ children: cells }));
    contentStart += row.nodeSize;
  });
  return [new docx.Table({ rows, width: { size: 100, type: docx.WidthType.PERCENTAGE } })];
}

function convertListItem(
  item: ProseMirrorNode,
  pos: number,
  ctx: ConvertContext,
  kind: 'bullet' | 'decimal' | 'task',
  level: number,
): DocxBlock[] {
  const { docx } = ctx;
  const blocks: DocxBlock[] = [];
  let childPos = pos + 1;
  let markedFirstParagraph = false;

  item.forEach((child) => {
    const isNestedList = child.type.name === 'bulletList' || child.type.name === 'orderedList' || child.type.name === 'taskList';
    if (isNestedList) {
      blocks.push(...convertBlock(child, childPos, { ...ctx, listDepth: level + 1 }));
      childPos += child.nodeSize;
      return;
    }

    if (!markedFirstParagraph && child.type.name === 'paragraph') {
      markedFirstParagraph = true;
      const checkbox = kind === 'task' ? (item.attrs.checked ? CHECKBOX_CHECKED : CHECKBOX_UNCHECKED) : null;
      const children: ParagraphChild[] = checkbox
        ? [new docx.TextRun(`${checkbox} `), ...convertInline(child, childPos + 1, ctx)]
        : convertInline(child, childPos + 1, ctx);
      blocks.push(
        new docx.Paragraph({
          children,
          numbering: kind === 'task' || !ctx.listRef ? undefined : { reference: ctx.listRef, level: Math.min(level, MAX_LIST_LEVEL) },
          indent: kind === 'task' ? { left: (level + 1) * INDENT_PER_LEVEL } : undefined,
        }),
      );
    } else {
      blocks.push(...convertBlock(child, childPos, { ...ctx, listDepth: level + 1 }));
    }
    childPos += child.nodeSize;
  });

  return blocks;
}

function convertList(node: ProseMirrorNode, pos: number, ctx: ConvertContext, kind: 'bullet' | 'decimal' | 'task'): DocxBlock[] {
  const level = Math.min(ctx.listDepth, MAX_LIST_LEVEL);
  // 최상위 목록(다른 목록 안에 있지 않을 때)에 진입할 때만 새 번호 매기기 인스턴스를 만든다.
  // 그래야 서로 다른 목록이 번호를 이어받지 않고, 중첩된 하위 목록은 부모와 한 목록으로 이어진다.
  const listRef = kind === 'task' ? ctx.listRef : (ctx.listRef ?? allocateListRef(ctx, kind));
  const childCtx: ConvertContext = { ...ctx, listRef, listDepth: ctx.listDepth };

  const blocks: DocxBlock[] = [];
  let childPos = pos + 1;
  node.forEach((item) => {
    blocks.push(...convertListItem(item, childPos, childCtx, kind, level));
    childPos += item.nodeSize;
  });
  return blocks;
}

export function convertBlock(node: ProseMirrorNode, pos: number, ctx: ConvertContext): DocxBlock[] {
  const { docx } = ctx;
  const contentStart = pos + 1;

  switch (node.type.name) {
    case 'paragraph':
      return [new docx.Paragraph({ children: convertInline(node, contentStart, ctx), ...quoteParagraphStyle(ctx) })];

    case 'heading':
      return [
        new docx.Paragraph({
          heading: headingLevel(docx, node.attrs.level as number),
          children: convertInline(node, contentStart, ctx),
        }),
      ];

    case 'blockquote': {
      const innerCtx = { ...ctx, quoteDepth: ctx.quoteDepth + 1 };
      const blocks: DocxBlock[] = [];
      let childPos = contentStart;
      node.forEach((child) => {
        blocks.push(...convertBlock(child, childPos, innerCtx));
        childPos += child.nodeSize;
      });
      return blocks;
    }

    case 'bulletList':
      return convertList(node, pos, ctx, 'bullet');
    case 'orderedList':
      return convertList(node, pos, ctx, 'decimal');
    case 'taskList':
      return convertList(node, pos, ctx, 'task');

    case 'codeBlock':
      return convertCodeBlock(node, pos, ctx);

    case 'horizontalRule':
      return [
        new docx.Paragraph({
          spacing: { before: 240, after: 240 },
          border: { bottom: { style: docx.BorderStyle.SINGLE, size: 6, color: 'D1D5DB' } },
        }),
      ];

    case 'table':
      return convertTable(node, pos, ctx);

    case 'footnoteDefinition': {
      // 각주 정의는 본문에 남기지 않고 문서 끝의 각주 영역(ctx.footnotes)에 따로 모은다.
      const id = String(node.attrs.id);
      const blocks: DocxBlock[] = [];
      let childPos = contentStart;
      node.forEach((child) => {
        blocks.push(...convertBlock(child, childPos, ctx));
        childPos += child.nodeSize;
      });
      ctx.footnotes[id] = { children: blocks.filter((block): block is ParagraphType => block instanceof docx.Paragraph) };
      return [];
    }

    default:
      return [];
  }
}

// 문서 전체를 순회하며 최상위 블록 목록과 각주, 목록 번호 매기기 설정을 만든다.
export function convertDocument(
  doc: ProseMirrorNode,
  ctx: ConvertContext,
): { blocks: DocxBlock[]; numberingConfigs: ListNumberingConfig[] } {
  const blocks: DocxBlock[] = [];
  let pos = 0;
  doc.forEach((node) => {
    blocks.push(...convertBlock(node, pos, ctx));
    pos += node.nodeSize;
  });
  return { blocks: blocks.length ? blocks : [new ctx.docx.Paragraph({})], numberingConfigs: ctx.listConfigs };
}
