import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import type { Editor } from '@tiptap/core';
import { EditorContent, useEditor } from '@tiptap/react';
import { X } from 'lucide-react';
import readmeEn from '../../README.en.md?raw';
import readmeKo from '../../README.md?raw';
import { editorExtensions } from '../editor/extensions';
import { getLanguage, t, useLanguage } from '../i18n/i18n';
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

type ReadmeLanguage = 'ko' | 'en';

const README_FILES: Record<ReadmeLanguage, string> = { ko: 'README.md', en: 'README.en.md' };

// GitHub의 제목 앵커 규칙과 같게 만든다(소문자, 문장부호 제거, 공백은 '-'). 한글은 그대로 남긴다.
// 예: "PDF / Word로 내보내기" -> "pdf--word로-내보내기"
export function slugifyHeading(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');
}

// README 안의 링크가 가리키는 곳. 도움말 창 안에서 처리할 수 있는 것(다른 README, 같은 문서의 앵커)만 돌려주고,
// 나머지(저장소 파일 경로 등)는 null — 이런 링크를 그대로 두면 웹뷰가 앱 화면을 없는 경로로 이동시켜 버린다.
export type ReadmeLink = { kind: 'readme'; language: ReadmeLanguage; anchor?: string } | { kind: 'anchor'; id: string };

export function resolveReadmeLink(href: string): ReadmeLink | null {
  if (href.startsWith('#')) return { kind: 'anchor', id: decodeURIComponent(href.slice(1)) };
  const match = /^(?:\.\/)?(README(?:\.en)?\.md)(?:#(.*))?$/.exec(href);
  if (!match) return null;
  const language = match[1] === README_FILES.en ? 'en' : 'ko';
  return { kind: 'readme', language, anchor: match[2] ? decodeURIComponent(match[2]) : undefined };
}

// 읽기 전용 뷰에서 뺄 확장:
// - commandKeymap: 넣으면 여기서 Ctrl+S가 README를 저장해 버린다.
// - focusLineDecoration: 편집하지 않는데 커서 줄에 원본 문법(`# ` 등)이 끼어 보인다.
const EXCLUDED_EXTENSIONS = new Set(['commandKeymap', 'focusLineDecoration']);
const readOnlyExtensions = editorExtensions.filter((extension) => !EXCLUDED_EXTENSIONS.has(extension.name));

// 도움말: README.md를 사용자 문서와 별개의 읽기 전용 에디터로 보여준다(현재 문서를 건드리지 않는다).
export function HelpDialog({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  // 앱 언어가 바뀌면 이 창의 UI 문구도 따라가지만, README 본문 언어는 창 안의 English/한국어 링크로도 따로 바꿀 수 있다.
  useLanguage();
  const [language, setLanguage] = useState<ReadmeLanguage>(() => getLanguage());
  const scrollRef = useRef<HTMLDivElement>(null);
  const contents = useMemo(
    () => ({
      ko: parseMarkdown(editor.schema, prepareReadme(readmeKo)).toJSON(),
      en: parseMarkdown(editor.schema, prepareReadme(readmeEn)).toJSON(),
    }),
    [editor.schema],
  );
  const viewer = useEditor({ extensions: readOnlyExtensions, content: contents[language], editable: false, immediatelyRender: false });

  const scrollToAnchor = (id: string) => {
    const wanted = slugifyHeading(id);
    const heading = [...(scrollRef.current?.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6') ?? [])].find(
      (candidate) => slugifyHeading(candidate.textContent ?? '') === wanted,
    );
    heading?.scrollIntoView?.({ block: 'start' });
  };

  // 언어를 바꾸면 내용을 통째로 바꾸고 맨 위로 되돌린다. 앵커가 딸려 왔으면 그 제목으로 이동한다.
  const pendingAnchor = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!viewer) return;
    viewer.commands.setContent(contents[language]);
    if (pendingAnchor.current) scrollToAnchor(pendingAnchor.current);
    else scrollRef.current?.scrollTo?.({ top: 0 });
    pendingAnchor.current = undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, viewer, contents]);

  // 캡처 단계에서 가로채야 ProseMirror의 링크 처리보다 먼저 막을 수 있다.
  const onLinkClick = (event: MouseEvent) => {
    const anchor = (event.target as HTMLElement).closest('a');
    const href = anchor?.getAttribute('href');
    if (!anchor || !href || /^[a-z][a-z\d+.-]*:/i.test(href)) return; // https:, mailto: 등은 그대로 둔다
    event.preventDefault();
    event.stopPropagation();

    const link = resolveReadmeLink(href);
    if (link?.kind === 'anchor') scrollToAnchor(link.id);
    if (link?.kind === 'readme') {
      if (link.language === language) {
        if (link.anchor) scrollToAnchor(link.anchor);
        else scrollRef.current?.scrollTo?.({ top: 0 });
      } else {
        pendingAnchor.current = link.anchor;
        setLanguage(link.language);
      }
    }
  };

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
        aria-label={t('help.title')}
        className="flex h-[85vh] w-[880px] max-w-[calc(100%-32px)] flex-col overflow-hidden rounded-lg border border-chrome-border bg-white shadow-xl"
      >
        <div className="flex h-10 shrink-0 items-center justify-between border-b border-chrome-border bg-chrome px-4 text-ink">
          <span className="text-[13px]">{t('help.titleWithFile', { file: README_FILES[language] })}</span>
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded hover:bg-chrome-hover"
          >
            <X size={16} />
          </button>
        </div>
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-10 py-8" onClickCapture={onLinkClick}>
          <EditorContent editor={viewer} />
        </div>
      </div>
    </div>
  );
}
