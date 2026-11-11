import {
  DOMParser as ProseMirrorDOMParser,
  DOMSerializer,
  type Node as ProseMirrorNode,
  type Schema,
} from '@tiptap/pm/model';

// GFM 표는 셀 병합(colspan/rowspan)을 표현할 수 없다. 병합된 셀이 있는 표만 HTML <table>로 저장하고
// (마크다운은 원시 HTML을 허용한다), 다시 열 때 같은 모양으로 읽어 들인다. 병합이 없는 표는 계속 GFM이다.

export function hasMergedCells(table: ProseMirrorNode): boolean {
  let merged = false;
  table.descendants((node) => {
    if (merged) return false;
    if (Number(node.attrs.colspan ?? 1) > 1 || Number(node.attrs.rowspan ?? 1) > 1) merged = true;
    return !merged;
  });
  return merged;
}

// 줄 사이에 빈 줄이 없어야 마크다운이 한 덩어리의 HTML 블록으로 읽는다. 셀 내용은 스키마의 직렬화 규칙(DOMSerializer)을
// 그대로 쓰되, 이미지는 화면용 주소(asset URL)가 아니라 문서에 들어 있는 원래 src를 적는다.
export function tableToHtml(table: ProseMirrorNode): string {
  const base = DOMSerializer.fromSchema(table.type.schema);
  const serializer = new DOMSerializer(
    {
      ...base.nodes,
      image: (node) => ['img', { src: node.attrs.src, alt: node.attrs.alt ?? undefined, title: node.attrs.title ?? undefined }],
    },
    base.marks,
  );

  const lines: string[] = ['<table>'];
  table.forEach((row) => {
    const tr = document.createElement('tr');
    row.forEach((cell) => {
      const el = document.createElement(cell.type.name === 'tableHeader' ? 'th' : 'td');
      if ((cell.attrs.colspan as number) > 1) el.setAttribute('colspan', String(cell.attrs.colspan));
      if ((cell.attrs.rowspan as number) > 1) el.setAttribute('rowspan', String(cell.attrs.rowspan));
      el.appendChild(serializer.serializeFragment(cell.content));
      tr.appendChild(el);
    });
    lines.push(tr.outerHTML.replace(/\r?\n/g, ' '));
  });
  lines.push('</table>');
  return lines.join('\n');
}

// 읽어 들일 수 없는 HTML이면 null (호출한 쪽이 일반 텍스트로 되돌린다).
// 스키마가 아는 요소만 문서에 들어오므로 스크립트 등은 그대로 버려진다.
export function htmlToTable(schema: Schema, html: string): ProseMirrorNode | null {
  const dom = new window.DOMParser().parseFromString(html, 'text/html');
  const doc = ProseMirrorDOMParser.fromSchema(schema).parse(dom.body);
  const table = doc.firstChild;
  return doc.childCount === 1 && table?.type.name === 'table' ? table : null;
}
