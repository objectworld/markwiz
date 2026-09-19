import { convertFileSrc, isTauri } from '@tauri-apps/api/core';

// 마크다운에는 로컬 파일을 `file:///C:/Users/me/a%20b.png` 형태의 URL로 저장한다.
// 경로 그대로(`C:\...`)는 공백/괄호/역슬래시 때문에 마크다운 링크 문법과 충돌하기 때문이다.

const encodePath = (path: string): string => path.split('/').map(encodeURIComponent).join('/');

export function isLocalFileUrl(src: string): boolean {
  return /^file:/i.test(src);
}

export function pathToFileUrl(path: string): string {
  const normalized = path.replace(/\\/g, '/');

  const drive = /^([a-zA-Z]):\/(.*)$/.exec(normalized);
  if (drive) return `file:///${drive[1]}:/${encodePath(drive[2])}`;

  // \\server\share\a.png -> file://server/share/a.png
  if (normalized.startsWith('//')) return `file:${normalized.slice(0, 2)}${encodePath(normalized.slice(2))}`;

  return `file://${encodePath(normalized.startsWith('/') ? normalized : `/${normalized}`)}`;
}

export function fileUrlToPath(url: string): string {
  const match = /^file:\/\/([^/]*)(\/.*)?$/i.exec(url);
  if (!match) return url;

  const host = match[1];
  let path = decodeURIComponent(match[2] ?? '/');
  if (/^\/[a-zA-Z]:\//.test(path)) path = path.slice(1);
  return host && host.toLowerCase() !== 'localhost' ? `//${host}${path}` : path;
}

// 웹뷰는 file:// 이미지를 직접 읽을 수 없어서, Tauri에서는 asset 프로토콜 URL로 바꿔 화면에 그린다.
// 문서에 저장되는 값은 그대로 file:// URL이다.
export function resolveDisplaySrc(src: string | null | undefined): string {
  if (!src) return '';
  return isLocalFileUrl(src) && isTauri() ? convertFileSrc(fileUrlToPath(src)) : src;
}

const HAS_SCHEME = /^[a-zA-Z][a-zA-Z\d+.-]*:/;
const WINDOWS_PATH = /^([a-zA-Z]:[\\/]|\\\\)/;
const BARE_DOMAIN = /^[^\s/?#.]+(\.[^\s/?#.]+)+([/?#].*)?$/;

// 사용자가 입력한 주소를 저장할 값으로 다듬는다.
// - `C:\Users\me\a.png` 같은 윈도우 경로 -> file:// URL
// - `example.com/path` 처럼 스킴 없는 도메인 -> https://
// - 그 밖(mailto:, 상대 경로, #앵커 등)은 그대로 둔다.
export function normalizeUrl(input: string): string {
  const value = input.trim();
  if (!value) return '';
  if (WINDOWS_PATH.test(value)) return pathToFileUrl(value);
  if (HAS_SCHEME.test(value) || value.startsWith('//')) return value;
  return BARE_DOMAIN.test(value) ? `https://${value}` : value;
}
