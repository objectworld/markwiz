import type { Editor } from '@tiptap/core';
import { describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();
const listenMock = vi.fn();
const openRecentFileMock = vi.fn();

vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }));
vi.mock('@tauri-apps/api/event', () => ({ listen: listenMock }));
vi.mock('../../commands/fileCommands', () => ({ openRecentFile: openRecentFileMock }));

const { installStartupFileHandling } = await import('./startupFile');

const editor = {} as Editor;

describe('installStartupFileHandling', () => {
  it('opens the file the OS launched the app with (double-clicked .md)', async () => {
    invokeMock.mockResolvedValue('C:\\docs\\note.md');
    listenMock.mockResolvedValue(() => undefined);

    await installStartupFileHandling(editor);

    expect(invokeMock).toHaveBeenCalledWith('take_startup_file');
    expect(openRecentFileMock).toHaveBeenCalledWith(editor, 'C:\\docs\\note.md');
  });

  it('does nothing when the app was not launched with a file', async () => {
    invokeMock.mockResolvedValue(null);
    listenMock.mockResolvedValue(() => undefined);
    openRecentFileMock.mockClear();

    await installStartupFileHandling(editor);

    expect(openRecentFileMock).not.toHaveBeenCalled();
  });

  it('opens a file reported by a second instance via the open-file event, and returns the unlisten function', async () => {
    invokeMock.mockResolvedValue(null);
    let handler!: (event: { payload: string }) => void;
    const unlisten = vi.fn();
    listenMock.mockImplementation(async (_event: string, cb: typeof handler) => {
      handler = cb;
      return unlisten;
    });

    const dispose = await installStartupFileHandling(editor);
    expect(listenMock).toHaveBeenCalledWith('open-file', expect.any(Function));

    openRecentFileMock.mockClear();
    handler({ payload: 'C:\\docs\\other.md' });
    expect(openRecentFileMock).toHaveBeenCalledWith(editor, 'C:\\docs\\other.md');

    expect(dispose).toBe(unlisten);
  });
});
