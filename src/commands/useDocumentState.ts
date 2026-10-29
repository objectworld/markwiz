import { useSyncExternalStore } from 'react';
import { getDocumentState, subscribeDocumentState, type DocumentState } from './documentState';
import { getActiveTab, subscribeTabsState } from './tabsState';

export function useDocumentState(): DocumentState {
  return useSyncExternalStore((onChange) => subscribeDocumentState(() => onChange()), getDocumentState);
}

// 활성 탭이 마지막으로 열거나 저장한 뒤 바뀌었는지(상태바/탭의 점, 창 제목에 쓴다).
export function useDocumentDirty(): boolean {
  return useSyncExternalStore(subscribeTabsState, () => getActiveTab().dirty);
}
