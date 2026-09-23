import { afterEach, describe, expect, it, vi } from 'vitest';
import { webPlatform } from './platform.web';

afterEach(() => vi.restoreAllMocks());

describe('webPlatform.saveBinaryFileAs', () => {
  it('downloads the bytes as a Blob and resolves with the suggested name', async () => {
    // jsdom은 URL.createObjectURL을 구현하지 않으므로 직접 흉내 낸다.
    const createObjectURL = vi.fn((_blob: Blob) => 'blob:fake');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined);

    const bytes = new Uint8Array([1, 2, 3]);
    const saved = await webPlatform.saveBinaryFileAs(bytes, 'note.docx', { name: 'Word Document', extensions: ['docx'] });

    expect(createObjectURL).toHaveBeenCalledOnce();
    const blob = createObjectURL.mock.calls[0][0] as Blob;
    expect(await blob.arrayBuffer()).toEqual(bytes.buffer);
    expect(click).toHaveBeenCalledOnce();
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:fake');
    expect(saved).toEqual({ path: 'note.docx', name: 'note.docx' });

    vi.unstubAllGlobals();
  });
});
