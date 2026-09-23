import { describe, expect, it, vi } from 'vitest';

const saveMock = vi.fn();
const writeFileMock = vi.fn();

vi.mock('@tauri-apps/plugin-dialog', () => ({ open: vi.fn(), save: saveMock }));
vi.mock('@tauri-apps/plugin-fs', () => ({ readTextFile: vi.fn(), writeTextFile: vi.fn(), writeFile: writeFileMock }));

const { desktopPlatform } = await import('./platform.desktop');

describe('desktopPlatform.saveBinaryFileAs', () => {
  it('opens a save dialog with the given filter and writes the bytes to the chosen path', async () => {
    saveMock.mockResolvedValue('C:\\docs\\note.docx');
    const bytes = new Uint8Array([1, 2, 3]);

    const saved = await desktopPlatform.saveBinaryFileAs(bytes, 'note.docx', { name: 'Word Document', extensions: ['docx'] });

    expect(saveMock).toHaveBeenCalledWith({
      defaultPath: 'note.docx',
      filters: [{ name: 'Word Document', extensions: ['docx'] }],
    });
    expect(writeFileMock).toHaveBeenCalledWith('C:\\docs\\note.docx', bytes);
    expect(saved).toEqual({ path: 'C:\\docs\\note.docx', name: 'note.docx' });
  });

  it('returns null and writes nothing when the user cancels the dialog', async () => {
    saveMock.mockResolvedValue(null);
    writeFileMock.mockClear();

    const saved = await desktopPlatform.saveBinaryFileAs(new Uint8Array(), 'note.docx', { name: 'Word', extensions: ['docx'] });

    expect(saved).toBeNull();
    expect(writeFileMock).not.toHaveBeenCalled();
  });
});
