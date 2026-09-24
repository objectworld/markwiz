import { invoke } from '@tauri-apps/api/core';
import { getSavedLanguage, languageFromLocaleId, setLanguage } from '../../i18n/i18n';

// 설치 프로그램에서 고른 언어를 앱의 기본 언어로 쓴다. 우선순위: 사용자가 도움말 > 언어에서 직접 고른 값 >
// 설치 프로그램에서 고른 언어 > 브라우저/OS 언어. 그래서 직접 고른 값이 있으면 아무것도 하지 않고,
// 설치 언어는 저장하지 않는다(persist: false) — 안 그러면 나중에 설치 프로그램을 다른 언어로 다시 실행해도 바뀌지 않는다.
export async function applyInstallerLanguage(): Promise<void> {
  if (getSavedLanguage()) return;
  const localeId = await invoke<string | null>('installer_language');
  const language = languageFromLocaleId(localeId);
  if (language) setLanguage(language, { persist: false });
}
