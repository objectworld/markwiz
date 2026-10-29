import { Editor } from '@tiptap/core';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => true,
  convertFileSrc: (path: string) => `asset://localhost/${encodeURIComponent(path)}`,
}));

const { editorExtensions } = await import('./index');

// 탭마다 독립된 에디터가 있는 멀티 탭 구조에서는, 화면에 보이지 않는 다른 탭의 이미지가
// "지금 활성 탭"의 경로로 잘못 풀리면 안 된다. Image의 renderHTML이 전역 documentState가 아니라
// this.editor.storage.documentMeta.path(이 에디터 자신의 경로)를 읽는지 확인한다.
describe('per-editor image path resolution (documentMeta)', () => {
  it('resolves a relative image against this editor\'s own document path, not another editor\'s', () => {
    const editorA = new Editor({ extensions: editorExtensions, content: '' });
    const editorB = new Editor({ extensions: editorExtensions, content: '' });
    editorA.storage.documentMeta.path = 'C:/docs/a/note.md';
    editorB.storage.documentMeta.path = 'C:/docs/b/note.md';

    editorA.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'image', attrs: { src: './img/x.png' } }] }] });
    editorB.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'image', attrs: { src: './img/x.png' } }] }] });

    const srcA = editorA.view.dom.querySelector('img')?.getAttribute('src');
    const srcB = editorB.view.dom.querySelector('img')?.getAttribute('src');

    expect(srcA).toBe('asset://localhost/' + encodeURIComponent('C:/docs/a/img/x.png'));
    expect(srcB).toBe('asset://localhost/' + encodeURIComponent('C:/docs/b/img/x.png'));

    editorA.destroy();
    editorB.destroy();
  });

  it('falls back to no path when documentMeta.path was never set', () => {
    const editor = new Editor({ extensions: editorExtensions, content: '' });
    editor.commands.setContent({ type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'image', attrs: { src: 'https://example.com/a.png' } }] }] });

    expect(editor.view.dom.querySelector('img')?.getAttribute('src')).toBe('https://example.com/a.png');
    editor.destroy();
  });
});
