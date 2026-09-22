import { describe, expect, it } from 'vitest';
import {
  fileUrlToPath,
  isLocalFileUrl,
  isRelativeUrl,
  normalizeUrl,
  pathToFileUrl,
  relativizeLocalUrl,
  resolveDisplaySrc,
  resolveRelativePath,
} from './localFile';

describe('pathToFileUrl / fileUrlToPath', () => {
  it('converts a Windows path and encodes spaces, Korean, and reserved characters', () => {
    expect(pathToFileUrl('C:\\Users\\me\\My Docs\\a#1.png')).toBe('file:///C:/Users/me/My%20Docs/a%231.png');
    expect(pathToFileUrl('D:\\사진\\고양이.png')).toBe(
      'file:///D:/%EC%82%AC%EC%A7%84/%EA%B3%A0%EC%96%91%EC%9D%B4.png',
    );
  });

  it('converts UNC and POSIX paths', () => {
    expect(pathToFileUrl('\\\\server\\share\\a b.png')).toBe('file://server/share/a%20b.png');
    expect(pathToFileUrl('/home/me/a.png')).toBe('file:///home/me/a.png');
  });

  it('round-trips paths', () => {
    for (const path of ['C:/Users/me/My Docs/a#1.png', 'D:/사진/고양이.png', '//server/share/a b.png', '/home/me/a.png']) {
      expect(fileUrlToPath(pathToFileUrl(path))).toBe(path);
    }
  });
});

describe('normalizeUrl', () => {
  it('turns Windows paths into file URLs', () => {
    expect(normalizeUrl('C:\\Users\\me\\a.png')).toBe('file:///C:/Users/me/a.png');
  });

  it('adds https:// to bare domains only', () => {
    expect(normalizeUrl('example.com')).toBe('https://example.com');
    expect(normalizeUrl('  example.com/a/b?x=1 ')).toBe('https://example.com/a/b?x=1');
    expect(normalizeUrl('https://example.com')).toBe('https://example.com');
    expect(normalizeUrl('http://example.com')).toBe('http://example.com');
  });

  it('leaves mailto, anchors, and relative paths alone', () => {
    expect(normalizeUrl('mailto:a@b.co')).toBe('mailto:a@b.co');
    expect(normalizeUrl('#section')).toBe('#section');
    expect(normalizeUrl('images/a.png')).toBe('images/a.png');
    expect(normalizeUrl('./a.png')).toBe('./a.png');
    expect(normalizeUrl('   ')).toBe('');
  });
});

describe('resolveDisplaySrc', () => {
  it('leaves URLs unchanged outside Tauri', () => {
    expect(isLocalFileUrl('file:///C:/a.png')).toBe(true);
    expect(resolveDisplaySrc('file:///C:/a.png')).toBe('file:///C:/a.png');
    expect(resolveDisplaySrc('https://a.b/c.png')).toBe('https://a.b/c.png');
    expect(resolveDisplaySrc(null)).toBe('');
  });
});

describe('normalizeUrl with bare file names', () => {
  it('does not mistake a file name for a domain', () => {
    expect(normalizeUrl('a.png')).toBe('a.png');
    expect(normalizeUrl('Notes.MD')).toBe('Notes.MD');
    expect(normalizeUrl('report.pdf')).toBe('report.pdf');
    expect(normalizeUrl('example.com')).toBe('https://example.com');
  });
});

describe('relativizeLocalUrl', () => {
  const doc = 'C:\\docs\\note.md';

  it('makes files in the document folder and its subfolders relative', () => {
    expect(relativizeLocalUrl('file:///C:/docs/a.png', doc)).toBe('./a.png');
    expect(relativizeLocalUrl('file:///C:/docs/img/a.png', doc)).toBe('./img/a.png');
    expect(relativizeLocalUrl('file:///C:/docs/img/deep/a.png', doc)).toBe('./img/deep/a.png');
  });

  it('keeps spaces and Korean names percent-encoded', () => {
    expect(relativizeLocalUrl('file:///C:/docs/my%20img/%EA%B3%A0%EC%96%91%EC%9D%B4.png', doc)).toBe(
      './my%20img/%EA%B3%A0%EC%96%91%EC%9D%B4.png',
    );
  });

  it('ignores drive letter case and slash direction', () => {
    expect(relativizeLocalUrl('file:///c:/DOCS/a.png', 'C:/docs/note.md')).toBe('./a.png');
  });

  it('keeps an absolute file URL for the parent folder, other folders, and sibling folders with a shared prefix', () => {
    expect(relativizeLocalUrl('file:///C:/a.png', doc)).toBe('file:///C:/a.png');
    expect(relativizeLocalUrl('file:///D:/docs/a.png', doc)).toBe('file:///D:/docs/a.png');
    expect(relativizeLocalUrl('file:///C:/docs2/a.png', doc)).toBe('file:///C:/docs2/a.png');
  });

  it('leaves everything alone when the document is not saved yet or the address is not a file URL', () => {
    expect(relativizeLocalUrl('file:///C:/docs/a.png', null)).toBe('file:///C:/docs/a.png');
    expect(relativizeLocalUrl('https://a.b/c.png', doc)).toBe('https://a.b/c.png');
  });

  it('works for POSIX and UNC documents', () => {
    expect(relativizeLocalUrl('file:///home/me/docs/img/a.png', '/home/me/docs/n.md')).toBe('./img/a.png');
    expect(relativizeLocalUrl('file:///home/me/other/a.png', '/home/me/docs/n.md')).toBe('file:///home/me/other/a.png');
    expect(relativizeLocalUrl('file:///a.png', '/n.md')).toBe('./a.png');
    expect(relativizeLocalUrl('file://server/share/img/a.png', '\\\\server\\share\\n.md')).toBe('./img/a.png');
  });
});

describe('isRelativeUrl / resolveRelativePath', () => {
  it('recognizes document-relative addresses only', () => {
    for (const src of ['./a.png', 'img/a.png', '../a.png', 'a.png']) expect(isRelativeUrl(src)).toBe(true);
    for (const src of ['', 'https://a.b/c.png', 'file:///C:/a.png', 'data:image/png;base64,AAAA', '/a.png', '#x', 'C:\\a.png']) {
      expect(isRelativeUrl(src)).toBe(false);
    }
  });

  it('resolves against the document folder, decoding percent escapes and handling . and ..', () => {
    expect(resolveRelativePath('./img/my%20a.png', 'C:\\docs\\note.md')).toBe('C:/docs/img/my a.png');
    expect(resolveRelativePath('../a.png', 'C:/docs/note.md')).toBe('C:/a.png');
    expect(resolveRelativePath('../../../a.png', 'C:/docs/note.md')).toBe('C:/a.png');
    expect(resolveRelativePath('img/a.png', '/home/me/n.md')).toBe('/home/me/img/a.png');
    expect(resolveRelativePath('a.png', '/n.md')).toBe('/a.png');
  });
});
