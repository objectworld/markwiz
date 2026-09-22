import { useSyncExternalStore } from 'react';

// 파일 > 최근에 연 파일. 경로를 아는 데스크탑에서만 채워지고, 웹에서는 쓰지 않는다.
export const MAX_RECENT_FILES = 10;

export interface RecentFile {
  path: string;
  name: string;
}

const STORAGE_KEY = 'markwiz:recent-files';

let recent: RecentFile[] | null = null;
const listeners = new Set<() => void>();

// 윈도우 경로(드라이브 문자/UNC)는 대소문자를 구분하지 않고 `\`와 `/`가 같다.
function samePath(a: string, b: string): boolean {
  const normalize = (path: string) => path.replace(/\\/g, '/');
  const [x, y] = [normalize(a), normalize(b)];
  return /^([a-zA-Z]:|\/\/)/.test(x) ? x.toLowerCase() === y.toLowerCase() : x === y;
}

function isRecentFile(value: unknown): value is RecentFile {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as RecentFile).path === 'string' &&
    typeof (value as RecentFile).name === 'string' &&
    (value as RecentFile).path !== ''
  );
}

function load(): RecentFile[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter(isRecentFile).slice(0, MAX_RECENT_FILES) : [];
  } catch {
    // 저장소를 못 쓰거나 내용이 깨져 있으면 빈 목록으로 시작한다.
    return [];
  }
}

function commit(next: RecentFile[]): void {
  recent = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // 저장에 실패해도 이번 실행 동안은 메모리 목록으로 동작한다.
  }
  listeners.forEach((listener) => listener());
}

// 가장 최근에 연 파일이 맨 앞. 같은 파일을 다시 열면 중복 없이 맨 앞으로 옮기고, 10개를 넘는 오래된 항목은 버린다.
export function getRecentFiles(): readonly RecentFile[] {
  recent ??= load();
  return recent;
}

export function addRecentFile(file: RecentFile): void {
  const others = getRecentFiles().filter((existing) => !samePath(existing.path, file.path));
  commit([file, ...others].slice(0, MAX_RECENT_FILES));
}

export function removeRecentFile(path: string): void {
  commit(getRecentFiles().filter((existing) => !samePath(existing.path, path)));
}

export function clearRecentFiles(): void {
  commit([]);
}

// 테스트용: 메모리 캐시를 버려 다음 조회 때 저장소에서 다시 읽게 한다.
export function resetRecentFilesCache(): void {
  recent = null;
}

export function subscribeRecentFiles(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useRecentFiles(): readonly RecentFile[] {
  return useSyncExternalStore(subscribeRecentFiles, getRecentFiles);
}

// 메뉴에 보조로 보여줄 파일이 있는 폴더.
export function folderOf(path: string): string {
  const normalized = path.replace(/\\/g, '/');
  return normalized.slice(0, Math.max(normalized.lastIndexOf('/'), 0)) || '/';
}
