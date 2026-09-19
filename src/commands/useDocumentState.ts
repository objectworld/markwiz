import { useSyncExternalStore } from 'react';
import { getDocumentState, subscribeDocumentState, type DocumentState } from './documentState';

export function useDocumentState(): DocumentState {
  return useSyncExternalStore((onChange) => subscribeDocumentState(() => onChange()), getDocumentState);
}
