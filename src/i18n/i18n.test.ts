import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  detectLanguage,
  getLanguage,
  getSavedLanguage,
  languageFromLocaleId,
  setLanguage,
  subscribeLanguage,
  t,
  translate,
} from './i18n';
import { en, ko } from './messages';

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();

describe('message dictionaries', () => {
  it('have the same keys in Korean and English', () => {
    expect(Object.keys(en).sort()).toEqual(Object.keys(ko).sort());
  });

  it('use the same {placeholders} in both languages', () => {
    for (const key of Object.keys(ko) as (keyof typeof ko)[]) {
      expect(placeholders(en[key]), key).toEqual(placeholders(ko[key]));
    }
  });

  it('have no Korean left in the English dictionary (except the deliberately bilingual language menu)', () => {
    for (const [key, value] of Object.entries(en)) {
      if (key === 'menu.language') continue;
      expect(/[가-힣]/.test(value), `${key}: ${value}`).toBe(false);
    }
  });

  it('never leave a translation empty', () => {
    for (const [key, value] of Object.entries(en)) expect(value.trim(), key).not.toBe('');
    for (const [key, value] of Object.entries(ko)) expect(value.trim(), key).not.toBe('');
  });
});

describe('translate', () => {
  it('fills {placeholders} and leaves unknown ones untouched', () => {
    expect(translate('en', 'status.words', { n: 3 })).toBe('3 words');
    expect(translate('ko', 'status.words', { n: 3 })).toBe('단어 3개');
    expect(translate('en', 'status.words')).toBe('{n} words');
  });
});

describe('detectLanguage', () => {
  it('follows the browser language: Korean for ko*, English for anything else', () => {
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['ko-KR', 'en-US']);
    expect(detectLanguage()).toBe('ko');
    vi.spyOn(navigator, 'languages', 'get').mockReturnValue(['fr-FR']);
    expect(detectLanguage()).toBe('en');
  });
});

describe('languageFromLocaleId (Windows installer language)', () => {
  it('maps 1042 to Korean and other valid ids to English', () => {
    expect(languageFromLocaleId('1042')).toBe('ko');
    expect(languageFromLocaleId('1033')).toBe('en');
    expect(languageFromLocaleId('  1042 ')).toBe('ko');
  });

  it('returns null for missing or unreadable values', () => {
    expect(languageFromLocaleId(null)).toBeNull();
    expect(languageFromLocaleId('')).toBeNull();
    expect(languageFromLocaleId('abc')).toBeNull();
  });
});

describe('setLanguage', () => {
  it('changes t(), notifies subscribers once, and updates <html lang>', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeLanguage(listener);

    setLanguage('en');
    expect(getLanguage()).toBe('en');
    expect(t('action.file.save')).toBe('Save');
    expect(document.documentElement.lang).toBe('en');

    setLanguage('en'); // 같은 언어면 알리지 않는다
    expect(listener).toHaveBeenCalledTimes(1);

    unsubscribe();
    setLanguage('ko');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(t('action.file.save')).toBe('저장');
  });

  it('persists an explicit choice, but not an installer/default one', () => {
    setLanguage('en', { persist: false });
    expect(getSavedLanguage()).toBeNull();
    setLanguage('en');
    expect(getSavedLanguage()).toBe('en');
    setLanguage('ko');
    expect(getSavedLanguage()).toBe('ko');
  });

  it('ignores a corrupted saved value', () => {
    localStorage.setItem('markwiz:language', 'xx');
    expect(getSavedLanguage()).toBeNull();
  });
});
