import { describe, expect, it } from 'vitest';
import { fileUrlToPath, isLocalFileUrl, normalizeUrl, pathToFileUrl, resolveDisplaySrc } from './localFile';

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
