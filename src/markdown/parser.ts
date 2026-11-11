import MarkdownIt, { type Token, type MarkdownIt as MarkdownItInstance } from 'markdown-it';
import footnote from 'markdown-it-footnote';
import { MarkdownParser } from 'prosemirror-markdown';
import { Fragment, type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';
import { CHECKBOX_PREFIX_RE } from './schema-map';
import { htmlToTable } from './tableHtml';

// markdown-it v15는 Token 생성자를 공개 API로 노출하지 않으므로, 파서가 실제로
// 읽는 필드(type)만 갖춘 최소한의 합성 토큰을 만들어 끼워 넣는다.
function syntheticToken(type: string): Token {
  return { type } as unknown as Token;
}

// GFM 표의 th/td는 markdown-it에서 <inline> 토큰을 문단 래핑 없이 바로 담지만,
// 우리 스키마의 tableCell/tableHeader는 block 콘텐츠(paragraph 등)를 요구한다.
// 파싱 전에 각 th/td의 inline 토큰을 paragraph_open/close로 감싸 스키마를 만족시킨다.
function wrapTableCellsInParagraphs(tokens: Token[]): Token[] {
  const result: Token[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (tok.type === 'th_close' || tok.type === 'td_close') {
      result.push(syntheticToken('paragraph_close'));
    }
    result.push(tok);
    if (tok.type === 'th_open' || tok.type === 'td_open') {
      result.push(syntheticToken('paragraph_open'));
    }
  }
  return result;
}

// 병합된 셀이 있는 표는 HTML <table> 블록으로 저장된다(tableHtml.ts). html 옵션을 켜면 다른 HTML까지 모두
// 토큰이 달라지므로, `<table`로 시작해 `</table>`로 끝나는 블록만 이 규칙으로 따로 잡고 나머지 HTML은 지금처럼 텍스트로 둔다.
function htmlTableRule(...[state, startLine, endLine, silent]: Parameters<Parameters<MarkdownItInstance['block']['ruler']['before']>[2]>): boolean {
  const lineText = (line: number) => state.src.slice(state.bMarks[line] + state.tShift[line], state.eMarks[line]);
  if (state.sCount[startLine] - state.blkIndent >= 4 || !/^<table[\s>]/i.test(lineText(startLine))) return false;

  let last = startLine;
  while (last < endLine && !/<\/table\s*>/i.test(lineText(last))) last += 1;
  if (last >= endLine) return false;
  if (silent) return true;

  const token = state.push('html_table', '', 0);
  token.map = [startLine, last + 1];
  token.content = state.getLines(startLine, last + 1, state.blkIndent, true);
  token.block = true;
  state.line = last + 1;
  return true;
}

function createTokenizer(): MarkdownItInstance {
  const md = new MarkdownIt('default', { html: false }).use(footnote);
  md.block.ruler.before('html_block', 'html_table', htmlTableRule);
  // markdown-it은 file: 주소를 링크/이미지로 인정하지 않는다. 로컬 파일 삽입(file:///C:/...)이
  // 저장 후 다시 열었을 때 깨지지 않도록 file:만 추가로 허용한다(javascript:/vbscript:는 계속 막힌다).
  const defaultValidateLink = md.validateLink.bind(md);
  md.validateLink = (url) => defaultValidateLink(url) || /^file:/i.test(url.trim());
  const originalParse = md.parse.bind(md);
  md.parse = (src, env) => wrapTableCellsInParagraphs(originalParse(src, env));
  return md;
}

export function createParser(schema: Schema): MarkdownParser {
  // prosemirror-markdown은 markdown-it ^14를 자체 의존성으로 물고 있어 타입
  // 선언이 우리가 설치한 markdown-it 15(자체 번들 타입 포함)와 명목상 어긋난다.
  // 두 버전 모두 MarkdownParser가 실제로 쓰는 표면(parse/tokenizer 인터페이스)은
  // 동일하므로, 타입 경고만 우회한다.
  const tokenizer = createTokenizer() as unknown as ConstructorParameters<typeof MarkdownParser>[1];
  const parser = new MarkdownParser(schema, tokenizer, {
    paragraph: { block: 'paragraph' },
    heading: { block: 'heading', getAttrs: (tok) => ({ level: Number(tok.tag.slice(1)) }) },
    blockquote: { block: 'blockquote' },
    bullet_list: { block: 'bulletList' },
    ordered_list: { block: 'orderedList', getAttrs: (tok) => ({ start: Number(tok.attrGet('start')) || 1 }) },
    list_item: { block: 'listItem' },
    code_block: { block: 'codeBlock', noCloseToken: true },
    fence: { block: 'codeBlock', getAttrs: (tok) => ({ language: tok.info || null }), noCloseToken: true },
    hr: { node: 'horizontalRule' },
    image: {
      node: 'image',
      getAttrs: (tok) => ({
        src: tok.attrGet('src'),
        title: tok.attrGet('title') || null,
        alt: (tok.children?.[0] && tok.children[0].content) || null,
      }),
    },
    hardbreak: { node: 'hardBreak' },
    em: { mark: 'italic' },
    strong: { mark: 'bold' },
    s: { mark: 'strike' },
    link: {
      mark: 'link',
      getAttrs: (tok) => ({ href: tok.attrGet('href'), title: tok.attrGet('title') || null }),
    },
    code_inline: { mark: 'code', noCloseToken: true },
    table: { block: 'table' },
    thead: { ignore: true },
    tbody: { ignore: true },
    tr: { block: 'tableRow' },
    th: { block: 'tableHeader', getAttrs: (tok) => ({ align: tok.attrGet('style')?.match(/text-align:(\w+)/)?.[1] ?? null }) },
    td: { block: 'tableCell', getAttrs: (tok) => ({ align: tok.attrGet('style')?.match(/text-align:(\w+)/)?.[1] ?? null }) },
    footnote_ref: { node: 'footnoteReference', getAttrs: (tok) => ({ id: (tok.meta as { label: string }).label }) },
    footnote_anchor: { ignore: true, noCloseToken: true },
    footnote_block: { ignore: true },
    footnote: { block: 'footnoteDefinition', getAttrs: (tok) => ({ id: (tok.meta as { label: string }).label }) },
    // 아래에서 직접 핸들러를 달기 위한 자리 표시(토큰 스펙이 없으면 파서가 토큰을 거부한다).
    html_table: { ignore: true, noCloseToken: true },
  });

  // MarkdownParser의 토큰 스펙은 ProseMirror 노드를 통째로 끼워 넣는 방법이 없어, 병합된 셀이 있는 표(html_table)만
  // 핸들러를 직접 단다. tokenHandlers/push는 라이브러리의 공개 타입에는 없지만 실제로 존재하는 멤버다.
  const handlers = (parser as unknown as { tokenHandlers: Record<string, TokenHandler> }).tokenHandlers;
  handlers.html_table = (state, tok) => {
    const table = htmlToTable(schema, tok.content);
    if (table) {
      state.push(table);
      return;
    }
    // 읽을 수 없는 HTML이면 지금까지처럼 글자 그대로 문단에 둔다.
    state.push(schema.nodes.paragraph.create(null, schema.text(tok.content.trim())));
  };
  return parser;
}

type TokenHandler = (state: { push: (node: ProseMirrorNode) => void }, tok: Token) => void;

// 체크박스 목록("- [ ] "/"- [x] ")은 markdown-it에 플러그인 없이는 평범한 텍스트로
// 파싱되므로, 파싱된 문서 트리에서 bulletList를 후처리해 taskList/taskItem으로
// 재구성한다. 목록의 첫 항목이 체크박스면 목록 전체를 taskList로 취급한다
// (Markwiz 자신이 저장한 파일은 항상 이 형태이므로 실사용 round-trip에 충분함).
function getCheckboxMatch(item: ProseMirrorNode): { checked: boolean; rest: string } | null {
  const firstParagraph = item.firstChild;
  if (!firstParagraph || firstParagraph.type.name !== 'paragraph') return null;
  const firstText = firstParagraph.firstChild;
  if (!firstText || !firstText.isText || !firstText.text) return null;
  const match = CHECKBOX_PREFIX_RE.exec(firstText.text);
  if (!match) return null;
  return { checked: /x/i.test(match[1]), rest: match[2] };
}

function stripCheckboxPrefix(schema: Schema, item: ProseMirrorNode, rest: string): ProseMirrorNode {
  const firstParagraph = item.firstChild!;
  const firstText = firstParagraph.firstChild!;
  const remainingSiblings = firstParagraph.content.cut(firstText.nodeSize);
  const newParagraphContent = rest
    ? Fragment.from(schema.text(rest, firstText.marks)).append(remainingSiblings)
    : remainingSiblings;
  const newParagraph = schema.nodes.paragraph.create(firstParagraph.attrs, newParagraphContent);
  const newItemContent = Fragment.from(newParagraph).append(item.content.cut(firstParagraph.nodeSize));
  return item.copy(newItemContent);
}

function convertTaskLists(schema: Schema, node: ProseMirrorNode): ProseMirrorNode {
  if (node.type.name === 'bulletList') {
    const items: ProseMirrorNode[] = [];
    node.forEach((child) => items.push(child));
    const checkboxInfo = items.map(getCheckboxMatch);

    if (checkboxInfo[0]) {
      const taskItems = items.map((item, i) => {
        const info = checkboxInfo[i];
        const rebuiltItem = item.copy(
          Fragment.fromArray(mapChildren(item, (child) => convertTaskLists(schema, child))),
        );
        const finalItem = info ? stripCheckboxPrefix(schema, rebuiltItem, info.rest) : rebuiltItem;
        return schema.nodes.taskItem.create({ checked: Boolean(info?.checked) }, finalItem.content);
      });
      return schema.nodes.taskList.create(null, Fragment.fromArray(taskItems));
    }
  }

  if (node.isLeaf) return node;
  return node.copy(Fragment.fromArray(mapChildren(node, (child) => convertTaskLists(schema, child))));
}

function mapChildren(node: ProseMirrorNode, fn: (child: ProseMirrorNode) => ProseMirrorNode): ProseMirrorNode[] {
  const mapped: ProseMirrorNode[] = [];
  node.forEach((child) => mapped.push(fn(child)));
  return mapped;
}

export function parseMarkdown(schema: Schema, markdown: string): ProseMirrorNode {
  const parser = createParser(schema);
  const doc = parser.parse(markdown);
  return convertTaskLists(schema, doc);
}
