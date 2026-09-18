import { isTauri } from '@tauri-apps/api/core';
import type { PlatformAPI } from './types';

let cached: Promise<PlatformAPI> | null = null;

// 데스크탑 전용 모듈은 동적 import로만 불러와 웹 빌드 청크에 Tauri IPC
// 바인딩이 섞여 들어가지 않게 한다.
export function getPlatform(): Promise<PlatformAPI> {
  if (!cached) {
    cached = isTauri()
      ? import('./desktop/platform.desktop').then((m) => m.desktopPlatform)
      : import('./web/platform.web').then((m) => m.webPlatform);
  }
  return cached;
}

export type { OpenedDocument, PlatformAPI, SavedDocument } from './types';
