import { getActiveTab, patchTab, subscribeTabsState } from './tabsState';

// 이 모듈은 "활성 탭"의 path/name만 보여주는 하위 호환 창구다. 탭이 여러 개로 늘어나기 전부터
// 있던 API라 fileCommands.ts/InsertDialog.tsx/exportDocx.ts/extensions 등 대부분의 코드는
// 여전히 이 함수만 쓰면 되고, 탭 자체를 다뤄야 하는 코드(TabBar, Editor.tsx)만 tabsState.ts를
// 직접 쓴다. dirty 여부는 여기 포함하지 않는다(모양이 넓어지면 toEqual({path,name}) 테스트가
// 전부 깨짐) — 필요한 곳은 useDocumentDirty()로 따로 구독한다.
export interface DocumentState {
  path: string | null;
  name: string;
}

// useSyncExternalStore는 상태가 실제로 바뀌지 않았으면 getSnapshot()이 매번 같은 참조를
// 돌려줘야 한다(안 그러면 리렌더가 무한히 반복된다) — 그래서 매번 새 객체를 만들지 않고,
// path/name이 바뀐 경우에만 새로 만든다.
let cached: DocumentState = { path: null, name: 'untitled.md' };

export function getDocumentState(): DocumentState {
  const tab = getActiveTab();
  if (cached.path !== tab.path || cached.name !== tab.name) {
    cached = { path: tab.path, name: tab.name };
  }
  return cached;
}

export function setDocumentState(next: DocumentState): void {
  patchTab(getActiveTab().id, { path: next.path, name: next.name, dirty: false });
}

export function subscribeDocumentState(listener: (state: DocumentState) => void): () => void {
  return subscribeTabsState(() => listener(getDocumentState()));
}
