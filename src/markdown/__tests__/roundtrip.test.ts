import { getSchema } from '@tiptap/core';
import { describe, expect, it } from 'vitest';
import { editorExtensions } from '../../editor/extensions';
import { parseMarkdown } from '../parser';
import { serializeToMarkdown } from '../serializer';

const schema = getSchema(editorExtensions);

// round-trip 동치 기준: 줄 끝 공백/문서 끝 개행 차이는 무시하고 비교한다
// (직렬화 결과는 트레일링 개행을 추가하지 않으므로 입력도 trim해서 맞춘다).
function roundtrip(markdown: string): string {
  const doc = parseMarkdown(schema, markdown);
  return serializeToMarkdown(doc);
}

function expectRoundtrip(markdown: string) {
  expect(roundtrip(markdown.trim())).toBe(markdown.trim());
}

describe('markdown round-trip', () => {
  it('heading levels 1-6', () => {
    expectRoundtrip(
      `
# H1

## H2

### H3

#### H4

##### H5

###### H6
`,
    );
  });

  it('bold, italic, strike, inline code', () => {
    expectRoundtrip('This is **bold**, _italic_, ~~strike~~, and `code`.');
  });

  it('blockquote', () => {
    expectRoundtrip(
      `
> A quoted line
`,
    );
  });

  it('bullet list', () => {
    expectRoundtrip(
      `
- one
- two
- three
`,
    );
  });

  it('ordered list', () => {
    expectRoundtrip(
      `
1. one
2. two
3. three
`,
    );
  });

  it('task list', () => {
    expectRoundtrip(
      `
- [ ] todo
- [x] done
`,
    );
  });

  it('code block with language', () => {
    expectRoundtrip(
      `
\`\`\`js
const x = 1;
\`\`\`
`,
    );
  });

  it('mermaid code fence (rendered by a custom node view, still plain markdown text)', () => {
    expectRoundtrip(
      `
\`\`\`mermaid
graph TD; A-->B;
\`\`\`
`,
    );
  });

  it('plantuml code fence (rendered by a custom node view, still plain markdown text)', () => {
    expectRoundtrip(
      `
\`\`\`plantuml
@startuml
Alice -> Bob : hi
@enduml
\`\`\`
`,
    );
  });

  it('link and image', () => {
    expectRoundtrip('See [Markwiz](https://example.com) and ![alt text](https://example.com/x.png).');
  });

  it('horizontal rule', () => {
    expectRoundtrip(
      `
Above

---

Below
`,
    );
  });

  it('GFM table', () => {
    expectRoundtrip(
      `
| Name | Score |
| --- | --- |
| Alice | 1 |
| Bob | 2 |
`,
    );
  });

  it('footnote reference and definition', () => {
    expectRoundtrip(
      `
Here is a note[^1].

[^1]: The footnote body.
`,
    );
  });

  it('kitchen sink document', () => {
    expectRoundtrip(
      `
# Kitchen Sink

A paragraph with **bold**, _italic_, ~~strike~~, \`code\`, and a [link](https://example.com).

> Quoted wisdom.

- bullet one
- bullet two

1. step one
2. step two

- [ ] todo item
- [x] done item

\`\`\`ts
const x: number = 1;
\`\`\`

---

| A | B |
| --- | --- |
| 1 | 2 |

A footnoted claim[^note].

[^note]: Supporting detail.
`,
    );
  });
});
