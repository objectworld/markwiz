import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Maximize, X, ZoomIn, ZoomOut } from 'lucide-react';
import { t, useLanguage } from '../../i18n/i18n';
import { svgNaturalSize } from './svgSize';

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 8;
const BUTTON_FACTOR = 1.25;
// 처음 열 때 창에 맞추되, 작은 다이어그램을 지나치게 키우지는 않는다.
const MAX_INITIAL_ZOOM = 2;
const FALLBACK_SIZE = { width: 800, height: 600 };

const clamp = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

interface DiagramDialogProps {
  // 이미 sanitize된 SVG 문자열(DiagramView가 인라인으로 그리는 것과 같은 값)
  svg: string;
  title: string;
  onClose: () => void;
}

// 다이어그램을 클릭하면 뜨는 팝업. 문서 확대/축소와 별개로 이 그림만 확대·축소·이동할 수 있다.
export function DiagramDialog({ svg, title, onClose }: DiagramDialogProps) {
  useLanguage();
  const [zoom, setZoom] = useState(1);
  const bodyRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const size = useRef(svgNaturalSize(svg) ?? FALLBACK_SIZE);
  // 배율을 바꿀 때 지금 보고 있는 중심이 그대로 유지되도록, 바꾸기 전 스크롤 위치(비율)를 적어 둔다.
  const anchor = useRef<{ x: number; y: number } | null>(null);

  const fitZoom = useCallback(() => {
    const body = bodyRef.current;
    if (!body || !body.clientWidth || !body.clientHeight) return 1;
    const { width, height } = size.current;
    return clamp(Math.min((body.clientWidth - 32) / width, (body.clientHeight - 32) / height));
  }, []);

  const changeZoom = useCallback((next: number | ((current: number) => number)) => {
    const body = bodyRef.current;
    if (body && body.scrollWidth && body.scrollHeight) {
      anchor.current = {
        x: (body.scrollLeft + body.clientWidth / 2) / body.scrollWidth,
        y: (body.scrollTop + body.clientHeight / 2) / body.scrollHeight,
      };
    }
    setZoom((current) => clamp(typeof next === 'function' ? next(current) : next));
  }, []);

  // 처음에는 창에 맞춘 크기로 연다.
  useLayoutEffect(() => {
    setZoom(Math.min(MAX_INITIAL_ZOOM, fitZoom()));
  }, [fitZoom]);

  // SVG에 들어 있는 width="100%"/max-width 같은 값을 눌러 우리가 정한 배율의 픽셀 크기로 고정한다.
  useLayoutEffect(() => {
    const el = hostRef.current?.querySelector('svg');
    if (!el) return;
    const width = `${size.current.width * zoom}px`;
    const height = `${size.current.height * zoom}px`;
    el.setAttribute('width', width);
    el.setAttribute('height', height);
    el.style.width = width;
    el.style.height = height;
    el.style.maxWidth = 'none';

    const body = bodyRef.current;
    if (body && anchor.current) {
      body.scrollLeft = anchor.current.x * body.scrollWidth - body.clientWidth / 2;
      body.scrollTop = anchor.current.y * body.scrollHeight - body.clientHeight / 2;
      anchor.current = null;
    }
  }, [zoom, svg]);

  // 닫으면 팝업을 열기 전에 포커스가 있던 곳(에디터)으로 돌려준다.
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    bodyRef.current?.focus();
    return () => previous?.focus?.();
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === '+' || event.key === '=') changeZoom((z) => z * BUTTON_FACTOR);
      else if (event.key === '-') changeZoom((z) => z / BUTTON_FACTOR);
      else if (event.key === '0') changeZoom(1);
      else return;
      // 팝업이 처리한 키는 에디터/앱 단축키로 흘러가지 않게 한다.
      event.preventDefault();
      event.stopPropagation();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose, changeZoom]);

  // Ctrl(Cmd)+휠 / 핀치로 확대·축소, 그냥 휠은 스크롤. 페이지 기본 확대를 막으려면 non-passive여야 한다.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      changeZoom((z) => z * Math.exp(-event.deltaY * 0.002));
    };
    body.addEventListener('wheel', onWheel, { passive: false });
    return () => body.removeEventListener('wheel', onWheel);
  }, [changeZoom]);

  // 마우스로 끌어서 이동(확대해서 스크롤바가 생겼을 때).
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex h-[85vh] w-[min(1100px,92vw)] flex-col overflow-hidden rounded-lg border border-chrome-border bg-canvas text-ink shadow-xl"
      >
        <div className="flex h-10 shrink-0 items-center gap-1 border-b border-chrome-border bg-chrome px-3">
          <span className="mr-auto truncate text-[13px]">{title}</span>
          <DialogButton label={t('diagram.zoomOut')} onClick={() => changeZoom((z) => z / BUTTON_FACTOR)}>
            <ZoomOut size={16} />
          </DialogButton>
          <button
            type="button"
            title={t('diagram.zoomReset')}
            onClick={() => changeZoom(1)}
            className="w-14 rounded px-1 py-1 text-center text-[12px] tabular-nums hover:bg-chrome-hover"
          >
            {Math.round(zoom * 100)}%
          </button>
          <DialogButton label={t('diagram.zoomIn')} onClick={() => changeZoom((z) => z * BUTTON_FACTOR)}>
            <ZoomIn size={16} />
          </DialogButton>
          <DialogButton label={t('diagram.fit')} onClick={() => changeZoom(fitZoom())}>
            <Maximize size={16} />
          </DialogButton>
          <DialogButton label={t('diagram.close')} onClick={onClose}>
            <X size={16} />
          </DialogButton>
        </div>
        <div
          ref={bodyRef}
          tabIndex={-1}
          className="flex flex-1 cursor-grab overflow-auto bg-white p-4 outline-none active:cursor-grabbing"
          onPointerDown={(event) => {
            if (event.button !== 0) return;
            const body = event.currentTarget;
            drag.current = { x: event.clientX, y: event.clientY, left: body.scrollLeft, top: body.scrollTop };
            body.setPointerCapture?.(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (!drag.current) return;
            const body = event.currentTarget;
            body.scrollLeft = drag.current.left - (event.clientX - drag.current.x);
            body.scrollTop = drag.current.top - (event.clientY - drag.current.y);
          }}
          onPointerUp={() => (drag.current = null)}
          onPointerCancel={() => (drag.current = null)}
        >
          {/* flex 컨테이너 안의 margin:auto — 작을 때는 가운데, 클 때는 왼쪽/위쪽부터 스크롤되어 잘리지 않는다. */}
          <div ref={hostRef} className="m-auto shrink-0" dangerouslySetInnerHTML={{ __html: svg }} />
        </div>
      </div>
    </div>,
    document.body,
  );
}

function DialogButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} className="rounded p-1.5 hover:bg-chrome-hover">
      {children}
    </button>
  );
}
