import type { Editor } from '@tiptap/core';
import type { CommandId } from './commandIds';

export type CommandHandler = (editor: Editor) => boolean | void;

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
  return handler(editor) !== false;
}

export function resetCommands(): void {
  handlers.clear();
}
