import { useEffect } from 'react';
import type { Editor } from '@tiptap/core';
import { reloadActiveFromDisk } from '../commands/fileCommands';
import { refreshMtime } from '../commands/externalChange';
import { activateTab } from '../commands/tabCommands';
import { getActiveTab, getTab } from '../commands/tabsState';
import { showNotice } from '../commands/viewState';
import { t, useLanguage } from '../i18n/i18n';
import { getPlatform } from '../platform';

const BUTTON = 'rounded border border-chrome-border px-3 py-1.5 text-[13px] hover:bg-chrome-hover';

// 열어 둔 파일이 다른 프로그램에서 바뀌었을 때 다시 불러올지 묻는 창.
// "현재 내용 유지"를 고르면 지금 수정 시각을 기준으로 삼아 같은 변경으로는 다시 묻지 않는다.
export function ExternalChangeDialog({ tabId, editors, onClose }: { tabId: string; editors: ReadonlyMap<string, Editor>; onClose: () => void }) {
  useLanguage();
  const tab = getTab(tabId);

  const keep = async () => {
    if (tab?.path) await refreshMtime(await getPlatform(), tab.path).catch(() => undefined);
    onClose();
  };

  const reload = async () => {
    if (!tab) return onClose();
    const outgoing = editors.get(getActiveTab().id) ?? null;
    activateTab(tabId, outgoing);
    const editor = editors.get(tabId);
    const ok = editor ? await reloadActiveFromDisk(editor) : false;
    if (!ok) showNotice(t('externalChange.failed', { name: tab.name }));
    onClose();
  };

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') void keep();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

  if (!tab) {
    onClose();
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div role="alertdialog" aria-modal="true" aria-label={t('externalChange.title')} className="w-[440px] max-w-[calc(100%-32px)] rounded-lg border border-chrome-border bg-white p-5 text-ink shadow-xl">
        <h2 className="mb-2 text-[15px] font-medium">{t('externalChange.title')}</h2>
        <p className="mb-5 text-[13px] text-ink-muted">{t(tab.dirty ? 'externalChange.bodyDirty' : 'externalChange.body', { name: tab.name })}</p>
        <div className="flex justify-end gap-2">
          <button type="button" className={BUTTON} onClick={() => void keep()}>
            {t('externalChange.keep')}
          </button>
          <button type="button" autoFocus className="rounded bg-accent px-4 py-1.5 text-[13px] text-white hover:opacity-90" onClick={() => void reload()}>
            {t('externalChange.reload')}
          </button>
        </div>
      </div>
    </div>
  );
}
