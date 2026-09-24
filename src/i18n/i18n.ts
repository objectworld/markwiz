import { useSyncExternalStore } from 'react';
import { en, ko, type MessageKey } from './messages';

export type Language = 'ko' | 'en';
export const LANGUAGES: readonly { id: Language; label: string }[] = [
  { id: 'ko', label: '한국어' },
  { id: 'en', label: 'English' },
];

// 사용자가 도움말 > 언어에서 고른 값. 이 값이 있으면 항상 최우선이다.
const STORAGE_KEY = 'markwiz:language';

const dictionaries: Record<Language, Record<MessageKey, string>> = { ko, en };

function isLanguage(value: unknown): value is Language {
  return value === 'ko' || value === 'en';
}

export function getSavedLanguage(): Language | null {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return isLanguage(saved) ? saved : null;
  } catch {
    return null;
  }
}

// 브라우저/OS 언어가 한국어면 한국어, 그 밖에는 영어.
export function detectLanguage(): Language {
  const preferred = typeof navigator === 'undefined' ? '' : (navigator.languages?.[0] ?? navigator.language ?? '');
  return preferred.toLowerCase().startsWith('ko') ? 'ko' : 'en';
}

// Windows 로케일 ID(설치 프로그램이 기록한 값, 예: "1042")를 앱 언어로 바꾼다. 한국어(0x0412=1042)만 ko, 나머지는 en.
export function languageFromLocaleId(localeId: string | null | undefined): Language | null {
  if (!localeId) return null;
  const id = Number.parseInt(localeId, 10);
  if (Number.isNaN(id)) return null;
  return id === 1042 ? 'ko' : 'en';
}

let current: Language = getSavedLanguage() ?? detectLanguage();
const listeners = new Set<() => void>();

function applyDocumentLanguage(): void {
  if (typeof document !== 'undefined') document.documentElement.lang = current;
}
applyDocumentLanguage();

export function getLanguage(): Language {
  return current;
}

// persist=true(기본)면 사용자가 직접 고른 것으로 저장해 이후 설치 언어/브라우저 언어보다 우선한다.
// persist=false는 설치 프로그램에서 고른 언어 같은 "기본값"을 적용할 때 쓴다.
export function setLanguage(language: Language, options: { persist?: boolean } = {}): void {
  const { persist = true } = options;
  if (persist) {
    try {
      localStorage.setItem(STORAGE_KEY, language);
    } catch {
      // 저장소를 못 써도 이번 실행 동안은 바뀐 언어로 동작한다.
    }
  }
  if (language === current) return;
  current = language;
  applyDocumentLanguage();
  listeners.forEach((listener) => listener());
}

export function subscribeLanguage(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// 컴포넌트에서 쓰면 언어가 바뀔 때 다시 그려진다.
export function useLanguage(): Language {
  return useSyncExternalStore(subscribeLanguage, getLanguage);
}

export type MessageParams = Record<string, string | number>;

export function translate(language: Language, key: MessageKey, params?: MessageParams): string {
  const template = dictionaries[language][key];
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in params ? String(params[name]) : match));
}

// 현재 언어로 옮긴다. React 밖(커맨드, 알림 등)에서 쓰는 함수형 진입점이라 호출 시점의 언어를 따른다.
export function t(key: MessageKey, params?: MessageParams): string {
  return translate(current, key, params);
}
