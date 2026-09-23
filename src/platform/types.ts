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

export type LocalFileKind = 'image' | 'any';

export interface PickedFile {
  // 문서에 저장할 주소. 데스크탑: file:// URL, 웹(이미지): data: URL.
  url: string;
  name: string;
}

export interface BinaryFileFilter {
  name: string;
  extensions: string[];
}

export interface PlatformAPI {
  // 경로로 파일을 바로 연다(최근에 연 파일). 파일 경로를 아는 데스크탑에서만 구현한다.
  // 이 플랫폼에서만 최근 파일 목록을 기록한다. 파일이 없거나 읽을 수 없으면 예외를 던진다.
  openFileAt?(path: string): Promise<OpenedDocument>;
  // 링크/이미지 삽입 창에서 "파일 선택"이 지원하는 종류. 웹은 파일 경로를 얻을 수 없어 이미지(data URL)만 가능하다.
  readonly localFileKinds: readonly LocalFileKind[];
  // 사용자가 취소하면 null.
  pickLocalFile(kind: LocalFileKind): Promise<PickedFile | null>;
  openFile(): Promise<OpenedDocument | null>;
  // 데스크탑: 실제 경로에 덮어쓰기. 웹: path를 파일명으로 써서 다운로드.
  saveFile(path: string, content: string): Promise<void>;
  saveFileAs(content: string, suggestedName: string): Promise<SavedDocument | null>;
  // Word 내보내기 등 텍스트가 아닌 파일을 저장한다. 사용자가 취소하면 null.
  // 데스크탑: 저장 대화상자 + 실제 파일 쓰기. 웹: 다운로드.
  saveBinaryFileAs(data: Uint8Array, suggestedName: string, filter: BinaryFileFilter): Promise<SavedDocument | null>;
}

export function basename(path: string): string {
  return path.split(/[\\/]/).pop() || path;
}
