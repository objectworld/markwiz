export interface DocumentState {
  path: string | null;
  name: string;
}

let state: DocumentState = { path: null, name: 'untitled.md' };
const listeners = new Set<(state: DocumentState) => void>();

export function getDocumentState(): DocumentState {
  return state;
}

export function setDocumentState(next: DocumentState): void {
  state = next;
  listeners.forEach((listener) => listener(state));
}

export function subscribeDocumentState(listener: (state: DocumentState) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
