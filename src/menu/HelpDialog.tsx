import { useEffect, useMemo } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { X } from 'lucide-react';
import readme from '../../README.md?raw';
import { editorExtensions } from '../editor/extensions';
import { parseMarkdown } from '../markdown/parser';
import '../styles/editor.css';

// README가 참조하는 이미지는 저장소 상대 경로(docs/images/...)라 번들된 URL로 바꿔야 보인다.
const bundledImages = import.meta.glob('../../docs/images/screenshot.png', {
  eager: true,
  query: '?url',
  import: 'default',
}) as Record<string, string>;

// 마크다운 파서가 다루지 않는 raw HTML(맨 위 배너)은 빼고, 이미지 경로를 번들 URL로 바꾼다.
export function prepareReadme(source: string): string {
  return source
    .replace(/<p align="center">[\s\S]*?<\/p>\s*/, '')
    .replace(/\]\((docs\/images\/[^)\s]+)\)/g, (match, path: string) => {
      const url = bundledImages[`../../${path}`];
      return url ? `](${url})` : match;
    });
}

// 읽기 전용 뷰에서 뺄 확장:
// - commandKeymap: 넣으면 여기서 Ctrl+S가 README를 저장해 버린다.
// - focusLineDecoration: 편집하지 않는데 커서 줄에 원본 문법(`# ` 등)이 끼어 보인다.
const EXCLUDED_EXTENSIONS = new Set(['commandKeymap', 'focusLineDecoration']);
const readOnlyExtensions = editorExtensions.filter((extension) => !EXCLUDED_EXTENSIONS.has(extension.name));

// 도움말: README.md를 사용자 문서와 별개의 읽기 전용 에디터로 보여준다(현재 문서를 건드리지 않는다).
export function HelpDialog({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const content = useMemo(() => parseMarkdown(editor.schema, prepareReadme(readme)).toJSON(), [editor.schema]);
  const viewer = useEditor({ extensions: readOnlyExtensions, content, editable: false, immediatelyRender: false });

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="도움말"
        className="flex h-[85vh] w-[880px] max-w-[calc(100%-32px)] flex-col overflow-hidden rounded-lg border border-chrome-border bg-white shadow-xl"
      >
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-chrome-border bg-chrome px-4 text-ink">
          <span className="text-[13px]">도움말 — README.md</span>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-chrome-hover"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-10 py-8">
          <EditorContent editor={viewer} />
        </div>
      </div>
    </div>
  );
}
