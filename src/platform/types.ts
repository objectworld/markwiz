export interface OpenedDocument {
  // 데스크탑에서는 실제 파일 경로, 웹에서는 실제 파일시스템 경로가 없어 null.
  path: string | null;
  name: string;
  content: string;
}

export interface SavedDocument {
  path: string;
  name: string;
}

export interface PlatformAPI {
  openFile(): Promise<OpenedDocument | null>;
  // 데스크탑: 실제 경로에 덮어쓰기. 웹: path를 파일명으로 써서 다운로드.
  saveFile(path: string, content: string): Promise<void>;
  saveFileAs(content: string, suggestedName: string): Promise<SavedDocument | null>;
}

export function basename(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}
