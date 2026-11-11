import { useSyncExternalStore } from 'react';

// 링크/이미지 삽입 창을 열 때 필요한 정보. 커맨드가 채우고 InsertDialog가 읽는다.
export interface InsertRequest {
  kind: 'link' | 'image';
  // 링크: 커서가 놓인 기존 링크의 주소(없으면 빈 문자열)
  url: string;
  // 링크를 걸 대상(선택 영역 또는 기존 링크)이 이미 있는지. 없으면 표시 텍스트를 새로 넣는다.
  hasSelection: boolean;
}

export interface ViewState {
  sidebar: boolean;
  // 개요 영역(사이드바) 폭(px). 경계를 끌어서 바꾼다.
  sidebarWidth: number;
  sourceMode: boolean;
  focusMode: boolean;
  typewriterMode: boolean;
  // 문서 확대/축소 배율(1 = 100%). 문서 종이와 소스 모드에만 적용되고 리본/메뉴는 그대로다.
  zoom: number;
  // 도움말(README) 창 표시 여부
  help: boolean;
  // 정보(버전/소개) 창 표시 여부
  about: boolean;
  insert: InsertRequest | null;
  // 상태바에 잠깐 보여주는 안내 문구 (빈 문자열이면 없음)
  notice: string;
  // 소스 모드에서 textarea가 편집하는 마크다운 원문. 소스 모드가 꺼져 있을 때는 의미가 없다.
  sourceText: string;
  // 바뀐 내용이 있는 탭을 닫으려 할 때 "저장 후 닫기/저장 없이 닫기/취소"를 물어보는 창.
  // 탭 id가 있으면 그 탭에 대해 묻는 중이라는 뜻.
  closeTabConfirm: string | null;
}

export const SIDEBAR_DEFAULT_WIDTH = 256;
export const SIDEBAR_MIN_WIDTH = 160;
export const SIDEBAR_MAX_WIDTH = 640;
const SIDEBAR_WIDTH_KEY = 'markwiz:sidebar-width';

// 창이 좁을 때 문서 영역이 사라지지 않도록 창 폭에 맞춰서도 상한을 둔다.
export function clampSidebarWidth(width: number): number {
  const max = Math.max(SIDEBAR_MIN_WIDTH, Math.min(SIDEBAR_MAX_WIDTH, window.innerWidth - 200));
  return Math.min(max, Math.max(SIDEBAR_MIN_WIDTH, Math.round(width)));
}

// 개요 영역 폭은 사용자가 바꾼 값을 기억한다(저장소를 못 쓰면 기본값).
function readStoredSidebarWidth(): number {
  try {
    const stored = Number(localStorage.getItem(SIDEBAR_WIDTH_KEY));
    return stored >= SIDEBAR_MIN_WIDTH && stored <= SIDEBAR_MAX_WIDTH ? stored : SIDEBAR_DEFAULT_WIDTH;
  } catch {
    return SIDEBAR_DEFAULT_WIDTH;
  }
}

export function saveSidebarWidth(width: number): void {
  try {
    localStorage.setItem(SIDEBAR_WIDTH_KEY, String(width));
  } catch {
    // 저장 못 해도 이번 실행 동안은 그대로 쓴다.
  }
}

const initialState: ViewState = {
  sidebar: true,
  sidebarWidth: readStoredSidebarWidth(),
  sourceMode: false,
  focusMode: false,
  typewriterMode: false,
  zoom: 1,
  help: false,
  about: false,
  insert: null,
  notice: '',
  sourceText: '',
  closeTabConfirm: null,
};

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;

export function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(zoom * 1000) / 1000));
}

let state: ViewState = initialState;
const listeners = new Set<() => void>();

export function getViewState(): ViewState {
  return state;
}

export function setViewState(patch: Partial<ViewState>): void {
  state = { ...state, ...patch };
  listeners.forEach((listener) => listener());
}

export function resetViewState(): void {
  clearTimeout(noticeTimer);
  state = initialState;
  listeners.forEach((listener) => listener());
}

let noticeTimer: ReturnType<typeof setTimeout> | undefined;

export function showNotice(message: string, durationMs = 6000): void {
  clearTimeout(noticeTimer);
  setViewState({ notice: message });
  noticeTimer = setTimeout(() => setViewState({ notice: '' }), durationMs);
}

export function subscribeViewState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useViewState(): ViewState {
  return useSyncExternalStore(subscribeViewState, getViewState);
}
