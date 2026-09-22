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

const HAS_SCHEME = /^[a-zA-Z][a-zA-Z\d+.-]*:/;

// 스킴이 없고 `/`, `#`, `?`로 시작하지 않는 주소(`./a.png`, `img/a.png`)는 문서 위치 기준 상대 경로다.
export function isRelativeUrl(src: string): boolean {
  return src !== '' && !HAS_SCHEME.test(src) && !/^[/#?\\]/.test(src);
}

// 문서 파일 경로에서 파일명을 뺀 폴더 (슬래시로 통일). 루트 바로 아래 파일이면 빈 문자열.
function dirname(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return normalized.slice(0, Math.max(normalized.lastIndexOf('/'), 0));
}

const isCaseInsensitivePath = (path: string): boolean => /^([a-zA-Z]:|\/\/)/.test(path);

// 로컬 파일 주소(file://)가 문서와 같은 폴더이거나 그 하위 폴더 안에 있으면 `./img/a.png` 형태의 상대 경로로 바꾼다.
// 상위 폴더나 다른 곳에 있는 파일, 그리고 아직 저장하지 않은 문서(docPath 없음)에서는 그대로 둔다.
// `./`를 항상 붙이는 이유: 폴더 없이 `a.png`만 남으면 normalizeUrl이 도메인으로 오해할 수 있다.
export function relativizeLocalUrl(url: string, docPath: string | null | undefined): string {
  if (!docPath || !isLocalFileUrl(url)) return url;

  const file = fileUrlToPath(url);
  const base = `${dirname(docPath)}/`;
  const insensitive = isCaseInsensitivePath(base);
  const inside = insensitive ? file.toLowerCase().startsWith(base.toLowerCase()) : file.startsWith(base);
  const rest = file.slice(base.length);
  return inside && rest !== '' ? `./${encodePath(rest)}` : url;
}

// 문서 위치 기준 상대 경로를 실제 파일 경로로 푼다 (`.`/`..`, %인코딩 처리).
export function resolveRelativePath(relative: string, docPath: string): string {
  const parts = dirname(docPath).split('/');
  for (const segment of relative.split('/').map(decodeURIComponent)) {
    if (segment === '' || segment === '.') continue;
    if (segment === '..') {
      if (parts.length > 1) parts.pop();
    } else {
      parts.push(segment);
    }
  }
  return parts.join('/');
}

// 웹뷰는 로컬 파일을 직접 읽을 수 없어서, Tauri에서는 asset 프로토콜 URL로 바꿔 화면에 그린다.
// - file:// 주소
// - 상대 경로 (문서가 저장돼 있어 기준 폴더를 알 때만)
// 문서에 저장되는 값은 그대로다.
export function resolveDisplaySrc(src: string | null | undefined, docPath?: string | null): string {
  if (!src) return '';
  if (!isTauri()) return src;
  if (isLocalFileUrl(src)) return convertFileSrc(fileUrlToPath(src));
  if (docPath && isRelativeUrl(src)) return convertFileSrc(resolveRelativePath(src, docPath));
  return src;
}

const WINDOWS_PATH = /^([a-zA-Z]:[\\/]|\\\\)/;
// `a.png`, `notes.md`처럼 폴더 없이 파일명만 입력한 경우는 도메인이 아니라 (문서 기준) 상대 경로로 본다.
const LOCAL_FILE_NAME = /^[^\s/?#]+\.(png|jpe?g|gif|svg|webp|bmp|avif|pdf|md|markdown|txt|docx?|xlsx?|pptx?|zip)$/i;
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
  if (LOCAL_FILE_NAME.test(value)) return value;
  return BARE_DOMAIN.test(value) ? `https://${value}` : value;
}
