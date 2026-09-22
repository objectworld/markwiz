import { useEffect, useState, type FormEvent } from 'react';
import type { Editor } from '@tiptap/core';
import { FolderOpen } from 'lucide-react';
import { getDocumentState } from '../commands/documentState';
import { normalizeUrl, relativizeLocalUrl } from '../platform/localFile';
import { getPlatform, type LocalFileKind } from '../platform';
import type { InsertRequest } from '../commands/viewState';

interface InsertValues {
  url: string;
  text: string;
  alt: string;
}

// 입력값을 문서에 저장할 주소로 다듬는다. 문서와 같은 폴더/하위 폴더의 로컬 파일은 상대 경로가 된다.
function toStoredUrl(input: string): string {
  return relativizeLocalUrl(normalizeUrl(input), getDocumentState().path);
}

// 링크: 선택 영역(또는 커서가 놓인 링크)이 있으면 그 범위에 적용하고, 없으면 표시 텍스트를 새로 넣는다.
// 주소를 비우면 링크를 제거한다.
export function applyLink(editor: Editor, request: InsertRequest, { url, text }: InsertValues): boolean {
  const href = toStoredUrl(url);
  const chain = editor.chain().focus();
  if (!href) return chain.extendMarkRange('link').unsetLink().run();
  if (!request.hasSelection) {
    return chain
      .insertContent({ type: 'text', text: text.trim() || href, marks: [{ type: 'link', attrs: { href } }] })
      .run();
  }
  return chain.extendMarkRange('link').setLink({ href }).run();
}

export function applyImage(editor: Editor, { url, alt }: InsertValues): boolean {
  const src = toStoredUrl(url);
  if (!src) return false;
  return editor.chain().focus().setImage({ src, alt: alt.trim() || undefined }).run();
}

const FIELD = 'w-full rounded border border-chrome-border bg-canvas px-2 py-1.5 text-[13px] text-ink outline-none focus:border-accent';
const BUTTON = 'rounded border border-chrome-border px-3 py-1.5 text-[13px] hover:bg-chrome-hover';

// 링크/이미지 삽입 창: 인터넷 주소를 입력하거나, 데스크탑 파일을 골라 넣을 수 있다.
export function InsertDialog({ editor, request, onClose }: { editor: Editor; request: InsertRequest; onClose: () => void }) {
  const isImage = request.kind === 'image';
  const [url, setUrl] = useState(request.url);
  const [text, setText] = useState('');
  const [alt, setAlt] = useState('');
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState('');
  const [fileKinds, setFileKinds] = useState<readonly LocalFileKind[]>([]);

  const fileKind: LocalFileKind = isImage ? 'image' : 'any';
  const canPickFile = fileKinds.includes(fileKind);
  // 웹에서 고른 이미지는 data URL이라 입력칸에 그대로 보이면 안 된다.
  const isDataUrl = url.startsWith('data:');

  useEffect(() => {
    let cancelled = false;
    void getPlatform().then((platform) => {
      if (!cancelled) setFileKinds(platform.localFileKinds);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const pickFile = async () => {
    setError('');
    try {
      const picked = await (await getPlatform()).pickLocalFile(fileKind);
      if (!picked) return;
      setUrl(relativizeLocalUrl(picked.url, getDocumentState().path));
      setFileName(picked.name);
      if (isImage && !alt) setAlt(picked.name.replace(/\.[^.]+$/, ''));
      if (!isImage && !text) setText(picked.name);
    } catch (pickError) {
      setError(pickError instanceof Error ? pickError.message : String(pickError));
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const values = { url, text, alt };
    if (isImage) {
      if (!applyImage(editor, values)) {
        setError('이미지 주소를 입력하거나 파일을 선택하세요.');
        return;
      }
    } else {
      applyLink(editor, request, values);
    }
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-label={isImage ? '이미지 삽입' : '링크 삽입'}
        onSubmit={submit}
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose();
        }}
        className="w-[520px] max-w-[calc(100%-32px)] rounded-lg border border-chrome-border bg-white p-5 text-ink shadow-xl"
      >
        <h2 className="mb-4 text-[15px] font-medium">{isImage ? '이미지 삽입' : '링크 삽입'}</h2>

        <label className="mb-1 block text-[12px] text-ink-muted" htmlFor="insert-url">
          {isImage ? '이미지 주소 또는 파일' : '링크 주소 또는 파일'}
        </label>
        <div className="mb-3 flex gap-2">
          <input
            id="insert-url"
            autoFocus
            className={FIELD}
            value={isDataUrl ? `(파일) ${fileName}` : url}
            readOnly={isDataUrl}
            placeholder="https://example.com"
            onChange={(event) => setUrl(event.target.value)}
          />
          {isDataUrl && (
            <button type="button" className={BUTTON} onClick={() => setUrl('')}>
              지우기
            </button>
          )}
          {canPickFile && (
            <button type="button" className={`${BUTTON} flex shrink-0 items-center gap-1.5`} onClick={() => void pickFile()}>
              <FolderOpen size={15} />
              파일 선택…
            </button>
          )}
        </div>

        {isImage ? (
          <>
            <label className="mb-1 block text-[12px] text-ink-muted" htmlFor="insert-alt">
              대체 텍스트
            </label>
            <input id="insert-alt" className={`${FIELD} mb-3`} value={alt} onChange={(event) => setAlt(event.target.value)} />
          </>
        ) : (
          !request.hasSelection && (
            <>
              <label className="mb-1 block text-[12px] text-ink-muted" htmlFor="insert-text">
                표시할 텍스트
              </label>
              <input id="insert-text" className={`${FIELD} mb-3`} value={text} onChange={(event) => setText(event.target.value)} />
            </>
          )
        )}

        <p className="mb-4 text-[12px] text-ink-muted">
          {isImage
            ? '인터넷 주소(https://…)를 입력하거나 파일을 선택하세요.'
            : '인터넷 주소(https://…)를 입력하거나 파일을 선택하세요. 주소를 비우면 링크가 제거됩니다.'}
        </p>
        {error && (
          <p role="alert" className="mb-3 text-[12px] text-accent">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button type="button" className={BUTTON} onClick={onClose}>
            취소
          </button>
          <button type="submit" className="rounded bg-accent px-4 py-1.5 text-[13px] text-white hover:opacity-90">
            {isImage ? '삽입' : '확인'}
          </button>
        </div>
      </form>
    </div>
  );
}
