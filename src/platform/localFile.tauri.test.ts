import { describe, expect, it, vi } from 'vitest';

vi.mock('@tauri-apps/api/core', () => ({
  isTauri: () => true,
  convertFileSrc: (path: string) => `asset://localhost/${encodeURIComponent(path)}`,
}));

const { resolveDisplaySrc } = await import('./localFile');

describe('resolveDisplaySrc in the desktop app', () => {
  const asset = (path: string) => `asset://localhost/${encodeURIComponent(path)}`;

  it('serves file:// images through the asset protocol', () => {
    expect(resolveDisplaySrc('file:///C:/pics/my%20cat.png')).toBe(asset('C:/pics/my cat.png'));
  });

  it('resolves relative images against the document folder', () => {
    expect(resolveDisplaySrc('./img/a%20b.png', 'C:\\docs\\note.md')).toBe(asset('C:/docs/img/a b.png'));
    expect(resolveDisplaySrc('img/a.png', 'C:/docs/note.md')).toBe(asset('C:/docs/img/a.png'));
  });

  it('leaves a relative address alone when the document has no location yet', () => {
    expect(resolveDisplaySrc('./img/a.png', null)).toBe('./img/a.png');
  });

  it('leaves web, data, and root-relative addresses alone', () => {
    for (const src of ['https://a.b/c.png', 'data:image/png;base64,AAAA', '/assets/a.png', 'asset://localhost/x']) {
      expect(resolveDisplaySrc(src, 'C:/docs/note.md')).toBe(src);
    }
  });
});
