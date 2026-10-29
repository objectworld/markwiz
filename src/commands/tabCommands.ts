import type { Editor } from '@tiptap/core';
import { executeCommand } from './registry';
import { closeTab, getTab, setActiveTabId, type DocumentTab } from './tabsState';
import { getViewState, setViewState } from './viewState';
import './viewCommands';

// 다른 탭으로 옮기기 전에, 지금 탭이 소스 모드라면 textarea 내용을 에디터에 반영하고
// 소스 모드를 끈다(view.sourceMode 커맨드를 다시 실행하면 그렇게 된다). 탭마다 소스 모드를
// 따로 두지 않고 "지금 보고 있는 탭을 벗어나면 끈다"로 단순화했다.
export function activateTab(id: string, outgoingEditor: Editor | null): void {
  if (outgoingEditor && getViewState().sourceMode) executeCommand('view.sourceMode', outgoingEditor);
  setActiveTabId(id);
}

// 탭을 닫으려 한다. 바뀐 내용이 없으면 바로 닫고, 있으면 저장할지 묻는 창을 띈다
// (실제로 닫는 일은 CloseTabDialog가 사용자의 선택에 따라 처리한다).
export function requestCloseTab(id: string): void {
  const tab: DocumentTab | undefined = getTab(id);
  if (!tab) return;
  if (tab.dirty) setViewState({ closeTabConfirm: id });
  else closeTab(id);
}
