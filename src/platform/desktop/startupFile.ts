import type { Editor } from '@tiptap/core';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { openRecentFile } from '../../commands/fileCommands';

// .md 파일 연결로 실행됐을 때(탐색기 더블클릭, "연결 프로그램") 그 파일을 연다.
// - 최초 실행: Rust가 시작 인자에서 골라 둔 경로를 take_startup_file로 한 번 받아온다.
// - 이미 떠 있는 창에 두 번째 실행이 겹친 경우: single-instance 플러그인이 보내는
//   "open-file" 이벤트를 받는다(그 실행은 새 창을 띄우지 않고 즉시 종료된다).
// 실제로 문서를 화면에 올리는 일은 openRecentFile이 한다(최근 파일 기록, 실패 시 안내도 동일하게 처리).
export async function installStartupFileHandling(editor: Editor): Promise<() => void> {
  const path = await invoke<string | null>('take_startup_file');
  if (path) void openRecentFile(editor, path);

  return await listen<string>('open-file', (event) => {
    void openRecentFile(editor, event.payload);
  });
}
