import { Extension } from '@tiptap/core';

declare module '@tiptap/core' {
  interface Storage {
    documentMeta: DocumentMetaStorage;
  }
}

// 탭마다 독립된 에디터 인스턴스가 있는 멀티 탭 구조에서, 전역 documentState(활성 탭 기준)를
// 그대로 쓰면 안 되는 두 가지를 에디터 자신의 storage에 담아 둔다.
// - path: 이미지의 상대 경로/file:// 주소를 풀 때 쓴다(화면에 보이지 않는 다른 탭의 이미지가
//   활성 탭의 경로로 잘못 풀리면 안 되므로, 전역이 아니라 "이 에디터" 기준이어야 한다).
// - loading: 파일을 열 때 editor.commands.setContent()가 'update' 이벤트를 내는데, 이건
//   사용자가 편집한 게 아니라 불러오는 중이라 탭의 dirty 표시를 켜면 안 된다(round-trip 테스트가
//   setContent 호출 자체는 그대로 'update'를 내는 것에 기대고 있어 emitUpdate:false로 막을 수 없다).
export interface DocumentMetaStorage {
  path: string | null;
  loading: boolean;
}

export const DocumentMeta = Extension.create<object, DocumentMetaStorage>({
  name: 'documentMeta',
  addStorage() {
    return { path: null, loading: false };
  },
});
