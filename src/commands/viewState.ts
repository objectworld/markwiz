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
  sourceMode: boolean;
  focusMode: boolean;
  typewriterMode: boolean;
  // 도움말(README) 창 표시 여부
  help: boolean;
  // 정보(버전/소개) 창 표시 여부
  about: boolean;
  insert: InsertRequest | null;
  // 소스 모드에서 textarea가 편집하는 마크다운 원문. 소스 모드가 꺼져 있을 때는 의미가 없다.
  sourceText: string;
}

const initialState: ViewState = {
  sidebar: true,
  sourceMode: false,
  focusMode: false,
  typewriterMode: false,
  help: false,
  about: false,
  insert: null,
  sourceText: '',
};

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
  state = initialState;
  listeners.forEach((listener) => listener());
}

export function subscribeViewState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useViewState(): ViewState {
  return useSyncExternalStore(subscribeViewState, getViewState);
}
