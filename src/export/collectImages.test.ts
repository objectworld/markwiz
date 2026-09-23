import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { editorExtensions } from '../editor/extensions';
import { collectRasterImages } from './collectImages';
import * as rasterize from './rasterize';

afterEach(() => vi.restoreAllMocks());

function positionOf(editor: Editor, typeName: string): number {
  let found = -1;
  editor.state.doc.descendants((node, pos) => {
    if (found === -1 && node.type.name === typeName) found = pos;
  });
  if (found === -1) throw new Error(`no ${typeName} node in the test document`);
  return found;
}

describe('collectRasterImages', () => {
  it('rasterizes an <img> found via nodeDOM at the image node position', async () => {
    const editor = new Editor({ extensions: editorExtensions, content: '<p><img src="https://a.b/c.png"></p>' });
    const img = document.createElement('img');
    const fake = { data: new Uint8Array([1]), width: 1, height: 1 };
    vi.spyOn(editor.view, 'nodeDOM').mockReturnValue(img);
    const rasterizeImage = vi.spyOn(rasterize, 'rasterizeImage').mockReturnValue(fake);

    const pos = positionOf(editor, 'image');
    const result = await collectRasterImages(editor);

    expect(rasterizeImage).toHaveBeenCalledWith(img);
    expect(result.get(pos)).toBe(fake);
    editor.destroy();
  });

  it('finds the <img> inside a wrapper element when nodeDOM does not return the <img> itself', async () => {
    const editor = new Editor({ extensions: editorExtensions, content: '<p><img src="https://a.b/c.png"></p>' });
    const wrapper = document.createElement('span');
    const img = document.createElement('img');
    wrapper.appendChild(img);
    vi.spyOn(editor.view, 'nodeDOM').mockReturnValue(wrapper);
    const rasterizeImage = vi.spyOn(rasterize, 'rasterizeImage').mockReturnValue(null);

    await collectRasterImages(editor);

    expect(rasterizeImage).toHaveBeenCalledWith(img);
    editor.destroy();
  });

  it('records null for an image whose DOM node cannot be found', async () => {
    const editor = new Editor({ extensions: editorExtensions, content: '<p><img src="https://a.b/c.png"></p>' });
    vi.spyOn(editor.view, 'nodeDOM').mockReturnValue(null);
    const rasterizeImage = vi.spyOn(rasterize, 'rasterizeImage');

    const pos = positionOf(editor, 'image');
    const result = await collectRasterImages(editor);

    expect(rasterizeImage).not.toHaveBeenCalled();
    expect(result.get(pos)).toBeNull();
    editor.destroy();
  });

  it('rasterizes a rendered diagram svg found inside the code block wrapper', async () => {
    const editor = new Editor({
      extensions: editorExtensions,
      content: { type: 'doc', content: [{ type: 'codeBlock', attrs: { language: 'mermaid' }, content: [{ type: 'text', text: 'graph TD;' }] }] },
    });
    const wrapper = document.createElement('div');
    wrapper.innerHTML = '<div class="markwiz-diagram-preview"><div class="markwiz-diagram-svg"><svg></svg></div></div>';
    vi.spyOn(editor.view, 'nodeDOM').mockReturnValue(wrapper);
    const fake = { data: new Uint8Array([2]), width: 2, height: 2 };
    const rasterizeSvg = vi.spyOn(rasterize, 'rasterizeSvg').mockResolvedValue(fake);

    const pos = positionOf(editor, 'codeBlock');
    const result = await collectRasterImages(editor);

    expect(rasterizeSvg).toHaveBeenCalledWith(wrapper.querySelector('svg'));
    expect(result.get(pos)).toBe(fake);
    editor.destroy();
  });

  it('records null for a diagram block with no rendered svg yet (error or empty source)', async () => {
    const editor = new Editor({
      extensions: editorExtensions,
      content: { type: 'doc', content: [{ type: 'codeBlock', attrs: { language: 'plantuml' }, content: [] }] },
    });
    vi.spyOn(editor.view, 'nodeDOM').mockReturnValue(document.createElement('div'));
    const rasterizeSvg = vi.spyOn(rasterize, 'rasterizeSvg');

    const pos = positionOf(editor, 'codeBlock');
    const result = await collectRasterImages(editor);

    expect(rasterizeSvg).not.toHaveBeenCalled();
    expect(result.get(pos)).toBeNull();
    editor.destroy();
  });

  it('leaves an ordinary (non-diagram) code block untouched', async () => {
    const editor = new Editor({
      extensions: editorExtensions,
      content: { type: 'doc', content: [{ type: 'codeBlock', attrs: { language: 'ts' }, content: [{ type: 'text', text: 'const x = 1;' }] }] },
    });
    const nodeDOM = vi.spyOn(editor.view, 'nodeDOM');

    const result = await collectRasterImages(editor);

    expect(nodeDOM).not.toHaveBeenCalled();
    expect(result.size).toBe(0);
    editor.destroy();
  });
});
