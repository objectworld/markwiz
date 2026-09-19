import { getCurrentWindow } from '@tauri-apps/api/window';

// document.title은 Tauri 창의 네이티브 제목 표시줄에 반영되지 않으므로 창 API로 직접 설정한다.
export function setWindowTitle(title: string): Promise<void> {
  return getCurrentWindow().setTitle(title);
}
