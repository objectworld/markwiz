import { useEffect } from 'react';
import { X } from 'lucide-react';
import {
  APP_AUTHOR,
  APP_LICENSE,
  APP_NAME,
  APP_REPOSITORY,
  APP_STACK,
  APP_VERSION,
} from '../appInfo';
import { t, useLanguage } from '../i18n/i18n';

// 도움말 > Markwiz 정보: 버전과 소개글.
export function AboutDialog({ onClose }: { onClose: () => void }) {
  useLanguage();
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
        aria-label={t('about.title', { name: APP_NAME })}
        className="relative w-[440px] max-w-[calc(100%-32px)] rounded-lg border border-chrome-border bg-white p-6 text-ink shadow-xl"
      >
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded hover:bg-chrome-hover"
        >
          <X size={16} />
        </button>

        <div className="mb-4 flex items-center gap-4">
          <img src="/favicon.svg" alt="" width={56} height={56} className="shrink-0" />
          <div>
            <h2 className="text-[20px] font-medium leading-tight">{APP_NAME}</h2>
            <p className="text-[13px] text-ink-muted">{t('about.version', { version: APP_VERSION })}</p>
          </div>
        </div>

        <p className="mb-4 text-[13px] leading-relaxed">{t('about.description')}</p>

        <dl className="grid grid-cols-[64px_1fr] gap-x-3 gap-y-1 border-t border-chrome-border pt-3 text-[12px]">
          <dt className="text-ink-muted">{t('about.stack')}</dt>
          <dd>{APP_STACK}</dd>
          <dt className="text-ink-muted">{t('about.license')}</dt>
          <dd>{APP_LICENSE}</dd>
          <dt className="text-ink-muted">{t('about.author')}</dt>
          <dd>{APP_AUTHOR}</dd>
          <dt className="text-ink-muted">{t('about.repository')}</dt>
          <dd className="select-text break-all">{APP_REPOSITORY}</dd>
        </dl>
      </div>
    </div>
  );
}
