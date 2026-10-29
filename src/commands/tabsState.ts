import { useSyncExternalStore } from 'react';
import { t } from '../i18n/i18n';
import { samePath } from './recentFiles';

// 열려 있는 문서 하나. 실제 에디터 인스턴스는 각 탭을 그리는 DocumentPane이 들고 있고,
// 여기서는 탭 식별/표시에 필요한 메타데이터만 보관한다.
export interface DocumentTab {
  id: string;
  path: string | null;
  name: string;
  // 마지막으로 열거나 저장한 뒤 내용이 바뀌었는지(탭의 점/제목줄 표시, 닫을 때 저장 확인용).
  dirty: boolean;
}

interface TabsState {
  tabs: DocumentTab[];
  activeId: string;
}

// 새 탭이 처음 그려질 때 어떤 내용으로 시작할지. 한 번만 쓰고 버리는 값이라
// 구독 대상인 TabsState 본체에는 넣지 않고 별도 보류 큐로 둔다(DocumentPane이 마운트되며 소비).
// markdown은 그 탭의 에디터가 만들어진 뒤(= 자기 schema가 생긴 뒤) 파싱해 넣는다 — 아직 없는
// 에디터의 스키마를 미리 만들어 쓰려던 시도(getSchema)가 TableKit 등에서 깨져서 포기했다.
export type InitialContent = { kind: 'html'; html: string } | { kind: 'markdown'; markdown: string } | { kind: 'empty' };

const pendingContent = new Map<string, InitialContent>();

function makeId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function createBlankTab(): DocumentTab {
  const id = makeId();
  pendingContent.set(id, { kind: 'empty' });
  return { id, path: null, name: 'untitled.md', dirty: false };
}

// 앱이 막 떴을 때(또는 마지막 탭을 모두 닫아 처음 상태로 되돌아갈 때) 보여줄 환영 문구 탭.
function createWelcomeTab(): DocumentTab {
  const id = makeId();
  pendingContent.set(id, { kind: 'html', html: t('editor.initialContent') });
  return { id, path: null, name: 'untitled.md', dirty: false };
}

let state: TabsState = (() => {
  const tab = createWelcomeTab();
  return { tabs: [tab], activeId: tab.id };
})();
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((listener) => listener());
}

export function getTabsState(): TabsState {
  return state;
}

export function subscribeTabsState(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTabsState(): TabsState {
  return useSyncExternalStore(subscribeTabsState, getTabsState);
}

export function getActiveTab(): DocumentTab {
  return state.tabs.find((tab) => tab.id === state.activeId) ?? state.tabs[0];
}

export function getTab(id: string): DocumentTab | undefined {
  return state.tabs.find((tab) => tab.id === id);
}

export function findTabByPath(path: string): DocumentTab | undefined {
  return state.tabs.find((tab) => tab.path !== null && samePath(tab.path, path));
}

// DocumentPane이 마운트될 때 한 번 꺼내 가는 초기 콘텐츠. 두 번째 호출부터는 빈 문서로 취급한다
// (리마운트는 일어나지 않지만, 안전하게 소비 후 비워 둔다).
export function takePendingContent(id: string): InitialContent {
  const content = pendingContent.get(id);
  pendingContent.delete(id);
  return content ?? { kind: 'empty' };
}

export function setActiveTabId(id: string): void {
  if (state.activeId === id || !state.tabs.some((tab) => tab.id === id)) return;
  state = { ...state, activeId: id };
  emit();
}

export function patchTab(id: string, patch: Partial<Omit<DocumentTab, 'id'>>): void {
  state = { ...state, tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, ...patch } : tab)) };
  emit();
}

// 새 탭을 만들어 활성화한다. 실제 내용 반영은 그 탭의 DocumentPane이 마운트되며 일어난다.
export function openTab(opts: { path: string | null; name: string; content: InitialContent }): string {
  const id = makeId();
  pendingContent.set(id, opts.content);
  state = { tabs: [...state.tabs, { id, path: opts.path, name: opts.name, dirty: false }], activeId: id };
  emit();
  return id;
}

// 탭을 닫는다. 마지막 탭을 닫으면 빈 문서 탭을 새로 만들어 항상 최소 하나는 열려 있게 한다.
export function closeTab(id: string): void {
  const index = state.tabs.findIndex((tab) => tab.id === id);
  if (index === -1) return;

  const remaining = state.tabs.filter((tab) => tab.id !== id);
  if (remaining.length === 0) {
    const tab = createBlankTab();
    state = { tabs: [tab], activeId: tab.id };
  } else {
    const nextActive = state.activeId === id ? (remaining[index] ?? remaining[index - 1]).id : state.activeId;
    state = { tabs: remaining, activeId: nextActive };
  }
  emit();
}

// 테스트용: 모듈 전역 상태를 처음 상태로 되돌린다(막 뜬 앱과 같은 환영 문구 탭 하나).
export function resetTabsState(): void {
  pendingContent.clear();
  const tab = createWelcomeTab();
  state = { tabs: [tab], activeId: tab.id };
  emit();
}
