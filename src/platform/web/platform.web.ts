import type { OpenedDocument, PlatformAPI, SavedDocument } from '../types';

function pickFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.md,.markdown,text/markdown';
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

function download(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// 웹에는 파일시스템 접근 권한이 없으므로 열기는 <input type="file"> 선택,
// 저장은 항상 다운로드로 처리한다 (CLAUDE.md의 플랫폼 추상화 요구사항대로).
export const webPlatform: PlatformAPI = {
  async openFile(): Promise<OpenedDocument | null> {
    const file = await pickFile();
    if (!file) return null;
    return { path: null, name: file.name, content: await file.text() };
  },

  async saveFile(path: string, content: string): Promise<void> {
    download(path, content);
  },

  async saveFileAs(content: string, suggestedName: string): Promise<SavedDocument | null> {
    download(suggestedName, content);
    return { path: suggestedName, name: suggestedName };
  },
};
