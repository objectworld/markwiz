import type { Editor } from '@tiptap/core';
import type { CommandId } from './commandIds';

export type CommandHandler = (editor: Editor) => boolean | void | Promise<boolean | void>;

const handlers = new Map<CommandId, CommandHandler>();

export function registerCommand(id: CommandId, handler: CommandHandler): void {
  handlers.set(id, handler);
}

export function hasCommand(id: CommandId): boolean {
  return handlers.has(id);
}

export function executeCommand(id: CommandId, editor: Editor): boolean {
  const handler = handlers.get(id);
  if (!handler) {
    console.warn(`[markwiz] command not implemented yet: ${id}`);
    return false;
  }

  const result = handler(editor);
  if (result instanceof Promise) {
    // 파일 다이얼로그 등 비동기 커맨드: 키맵/네이티브 메뉴 쪽에는 즉시
    // "처리함"을 알려 브라우저 기본 동작(예: Ctrl+S로 페이지 저장)을 막는다.
    result.catch((error: unknown) => console.error(`[markwiz] command failed: ${id}`, error));
    return true;
  }
  return result !== false;
}

export function resetCommands(): void {
  handlers.clear();
}
