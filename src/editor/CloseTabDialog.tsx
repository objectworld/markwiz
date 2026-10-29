import { useEffect } from 'react';
import type { Editor } from '@tiptap/core';
import { saveActiveDocument } from '../commands/fileCommands';
import { activateTab } from '../commands/tabCommands';
import { closeTab, getTab } from '../commands/tabsState';
import { t, useLanguage } from '../i18n/i18n';

const BUTTON = 'rounded border border-chrome-border px-3 py-1.5 text-[13px] hover:bg-chrome-hover';

// 바뀐 내용이 있는 탭을 닫으려 할 때 저장 여부를 묻는 창. 저장을 고르면 그 탭을 활성화해서
// 저장한다(file.save와 같은 규칙을 쓰려면 "활성 탭"이어야 하기 때문) — 그래서 "다른 이름으로
// 저장" 대화상자가 필요한 탭이면 잠깐 화면이 그 탭으로 바뀐다.
export function CloseTabDialog({ tabId, editors, onClose }: { tabId: string; editors: ReadonlyMap<string, Editor>; onClose: () => void }) {
  useLanguage();
  const tab = getTab(tabId);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  if (!tab) {
    onClose();
    return null;
  }

  const discard = () => {
    closeTab(tabId);
    onClose();
  };

  const save = async () => {
    activateTab(tabId, null);
    const editor = editors.get(tabId);
    const saved = editor ? await saveActiveDocument(editor) : false;
    if (saved) closeTab(tabId);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <div role="alertdialog" aria-modal="true" aria-label={t('tab.closeConfirmTitle')} className="w-[420px] max-w-[calc(100%-32px)] rounded-lg border border-chrome-border bg-white p-5 text-ink shadow-xl">
        <h2 className="mb-2 text-[15px] font-medium">{t('tab.closeConfirmTitle')}</h2>
        <p className="mb-5 text-[13px] text-ink-muted">{t('tab.closeConfirmBody', { name: tab.name })}</p>
        <div className="flex justify-end gap-2">
          <button type="button" className={BUTTON} onClick={onClose}>
            {t('tab.cancel')}
          </button>
          <button type="button" className={BUTTON} onClick={discard}>
            {t('tab.discard')}
          </button>
          <button type="button" className="rounded bg-accent px-4 py-1.5 text-[13px] text-white hover:opacity-90" onClick={() => void save()}>
            {t('tab.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
