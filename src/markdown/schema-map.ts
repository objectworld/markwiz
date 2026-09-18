// serializer.ts와 parser.ts가 함께 참조하는 매핑/유틸리티. 마크다운 토큰 <->
// 스키마 노드/마크 이름, 체크박스 정규식, 테이블 셀 이스케이프 등 양쪽에서
// 어긋나면 round-trip이 깨지는 값들을 한 곳에 모아 둔다.

export const CHECKBOX_PREFIX_RE = /^\[([ xX])]\s?(.*)$/s;

export function alignToGfm(align: unknown): string {
  switch (align) {
    case 'center':
      return ':---:';
    case 'right':
      return '---:';
    case 'left':
      return ':---';
    default:
      return '---';
  }
}

export function escapeTableCell(text: string): string {
  return text.replace(/\|/g, '\\|').replace(/\r?\n+/g, '<br>');
}

// prosemirror-markdown의 code 마크 직렬화 로직과 동일: 콘텐츠에 포함된
// 최長 백틱 연속 길이보다 긴 백틱으로 감싸야 안전하게 구분된다.
export function backticksFor(node: { isText: boolean; text?: string | null }, side: number): string {
  const ticks = /`+/g;
  let match: RegExpExecArray | null;
  let len = 0;
  if (node.isText && node.text) {
    while ((match = ticks.exec(node.text))) {
      len = Math.max(len, match[0].length);
    }
  }
  let result = len > 0 && side > 0 ? ' `' : '`';
  for (let i = 0; i < len; i++) result += '`';
  if (len > 0 && side < 0) result += ' ';
  return result;
}
