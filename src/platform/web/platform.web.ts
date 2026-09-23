import type { LocalFileKind, OpenedDocument, PickedFile, PlatformAPI, SavedDocument } from '../types';

function pickFile(accept = '.md,.markdown,text/markdown'): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => resolve(input.files?.[0] ?? null);
    input.click();
  });
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function download(filename: string, content: string): void {
  downloadBlob(filename, new Blob([content], { type: 'text/markdown;charset=utf-8' }));
}

// 웹에는 파일시스템 접근 권한이 없으므로 열기는 <input type="file"> 선택,
// 저장은 항상 다운로드로 처리한다 (CLAUDE.md의 플랫폼 추상화 요구사항대로).
// 웹에서 이미지를 문서에 넣으려면 data URL로 내용을 통째로 담는 수밖에 없어, 마크다운이 커지지 않도록 크기를 제한한다.
const MAX_WEB_IMAGE_BYTES = 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    reader.readAsDataURL(file);
  });
}

export const webPlatform: PlatformAPI = {
  localFileKinds: ['image'],

  async pickLocalFile(kind: LocalFileKind): Promise<PickedFile | null> {
    if (kind !== 'image') return null;
    const file = await pickFile('image/*');
    if (!file) return null;
    if (file.size > MAX_WEB_IMAGE_BYTES) {
      throw new Error('웹에서는 1MB 이하 이미지만 파일로 넣을 수 있습니다. 이미지 주소를 입력하세요.');
    }
    return { url: await readAsDataUrl(file), name: file.name };
  },

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

  async saveBinaryFileAs(data: Uint8Array, suggestedName: string): Promise<SavedDocument | null> {
    // 웹은 저장 대화상자가 없어 다운로드로 바로 저장한다 — filter는 데스크탑 전용(대화상자 확장자 필터)이라 여기선 쓰지 않는다.
    downloadBlob(suggestedName, new Blob([data.buffer as ArrayBuffer]));
    return { path: suggestedName, name: suggestedName };
  },
};
