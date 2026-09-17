import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';
import { editorExtensions } from './index';

// 실제 브라우저 타이핑과 동일하게 문자 단위로 handleTextInput을 거치도록 시뮬레이션한다.
// (편집기 커맨드로 텍스트를 뭉치로 삽입하면 입력 규칙이 트리거되지 않는다.)
function typeText(editor: Editor, text: string) {
  for (const ch of text) {
    const { from, to } = editor.state.selection;
    const handled = editor.view.someProp('handleTextInput', (fn) =>
      fn(editor.view, from, to, ch, () => editor.state.tr),
    );
    if (!handled) {
      editor.commands.insertContent(ch);
    }
  }
}

let editor: Editor | null = null;

function createEditor(html: string) {
  editor = new Editor({ extensions: editorExtensions, content: html });
  editor.commands.focus('end');
  return editor;
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe('markdown input rules', () => {
  it('converts "# " into a heading', () => {
    const e = createEditor('<p></p>');
    typeText(e, '# Title');
    expect(e.getHTML()).toContain('<h1>Title</h1>');
  });

  it('converts "**text**" into bold', () => {
    const e = createEditor('<p></p>');
    typeText(e, '**bold**');
    expect(e.getHTML()).toContain('<strong>bold</strong>');
  });

  it('converts "[text](url)" into a link when markdownLinks is enabled', () => {
    const e = createEditor('<p></p>');
    typeText(e, '[Markwiz](https://example.com)');
    expect(e.getHTML()).toContain('<a');
    expect(e.getHTML()).toContain('href="https://example.com"');
    expect(e.getHTML()).toContain('>Markwiz</a>');
  });

  it('converts "![alt](src)" into an image', () => {
    const e = createEditor('<p></p>');
    typeText(e, '![alt text](https://example.com/x.png)');
    expect(e.getHTML()).toContain('<img src="https://example.com/x.png" alt="alt text">');
  });

  it('converts "---" into a horizontal rule', () => {
    const e = createEditor('<p></p>');
    typeText(e, '---');
    expect(e.getHTML()).toContain('<hr>');
  });

  it('converts "> " into a blockquote', () => {
    const e = createEditor('<p></p>');
    typeText(e, '> Quote');
    expect(e.getHTML()).toContain('<blockquote>');
    expect(e.getHTML()).toContain('Quote');
  });

  it('converts "- " into a bullet list', () => {
    const e = createEditor('<p></p>');
    typeText(e, '- Item');
    expect(e.getHTML()).toContain('<ul>');
    expect(e.getHTML()).toContain('<li>');
  });

  it('converts "```lang " into a highlighted code block', () => {
    const e = createEditor('<p></p>');
    typeText(e, '```js ');
    let codeBlock: { language: string } | null = null;
    e.state.doc.descendants((node) => {
      if (node.type.name === 'codeBlock') codeBlock = node.attrs as { language: string };
    });
    expect(codeBlock).not.toBeNull();
    expect(codeBlock!.language).toBe('js');
  });

  it('converts "[ ] "/"[x] " into task items with the matching checked state', () => {
    const e = createEditor('<p></p>');
    typeText(e, '[x] Done');

    let taskItem: { checked: boolean } | null = null;
    e.state.doc.descendants((node) => {
      if (node.type.name === 'taskItem') taskItem = node.attrs as { checked: boolean };
    });
    expect(taskItem).not.toBeNull();
    expect(taskItem!.checked).toBe(true);
  });
});
