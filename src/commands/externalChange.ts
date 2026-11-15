import { useEffect } from 'react';
import { getPlatform } from '../platform';
import type { PlatformAPI } from '../platform/types';
import { getTabsState } from './tabsState';
import { getViewState, setViewState } from './viewState';

// 열어 둔(또는 마지막으로 저장한) 시점의 파일 수정 시각. 경로가 키다. 디스크의 수정 시각이 이 값과 달라지면
// 다른 프로그램이 파일을 바꾼 것이다. 우리가 저장한 직후에는 저장한 시각으로 다시 기록해 스스로를 변경으로 오인하지 않는다.
const known = new Map<string, number>();

export function rememberMtime(path: string | null, mtime: number | null | undefined): void {
  if (path && typeof mtime === 'number') known.set(path, mtime);
}

export async function refreshMtime(platform: PlatformAPI, path: string): Promise<void> {
  if (!platform.fileMtime) return;
  rememberMtime(path, await platform.fileMtime(path));
}

export function forgetMtimes(): void {
  known.clear();
}

let checking = false;

// 열려 있는 탭 중 디스크에서 바뀐 파일이 있으면 그 탭을 확인 창에 올린다(한 번에 하나씩).
// 파일이 없어졌거나 수정 시각을 못 읽으면 건드리지 않는다.
export async function checkExternalChanges(): Promise<void> {
  if (checking || getViewState().externalChange) return;
  checking = true;
  try {
    const platform = await getPlatform();
    if (!platform.fileMtime) return;
    for (const tab of getTabsState().tabs) {
      if (!tab.path) continue;
      const before = known.get(tab.path);
      if (before === undefined) continue;
      const now = await platform.fileMtime(tab.path);
      if (now === null || now === before) continue;
      // 확인을 기다리는 동안 다른 확인 창이 이미 떴으면 양보한다.
      if (getViewState().externalChange) return;
      setViewState({ externalChange: tab.id });
      return;
    }
  } catch (error) {
    console.error('[markwiz] failed to check for external changes', error);
  } finally {
    checking = false;
  }
}

// 창이 다시 포커스를 받을 때(다른 프로그램에서 파일을 고치고 돌아왔을 때) 확인한다.
export function useExternalChangeWatch(): void {
  useEffect(() => {
    const check = () => void checkExternalChanges();
    const onVisibility = () => {
      if (document.visibilityState === 'visible') check();
    };
    window.addEventListener('focus', check);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', check);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);
}
