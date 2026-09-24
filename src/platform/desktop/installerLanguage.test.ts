import { afterEach, describe, expect, it, vi } from 'vitest';

const invokeMock = vi.fn();
vi.mock('@tauri-apps/api/core', () => ({ invoke: invokeMock }));

const { applyInstallerLanguage } = await import('./installerLanguage');
const { getLanguage, setLanguage } = await import('../../i18n/i18n');

afterEach(() => {
  localStorage.clear();
  invokeMock.mockReset();
});

describe('applyInstallerLanguage', () => {
  it('uses the language chosen in the installer when the user has not picked one', async () => {
    invokeMock.mockResolvedValue('1033');
    await applyInstallerLanguage();
    expect(invokeMock).toHaveBeenCalledWith('installer_language');
    expect(getLanguage()).toBe('en');
    expect(localStorage.getItem('markwiz:language')).toBeNull(); // 기본값일 뿐 저장하지 않는다
  });

  it('does not override a language the user picked from the Help menu', async () => {
    setLanguage('ko'); // 직접 고름(저장됨)
    invokeMock.mockResolvedValue('1033');
    await applyInstallerLanguage();
    expect(invokeMock).not.toHaveBeenCalled();
    expect(getLanguage()).toBe('ko');
  });

  it('leaves the language alone when the installer left no value', async () => {
    invokeMock.mockResolvedValue(null);
    await applyInstallerLanguage();
    expect(getLanguage()).toBe('ko');
  });
});
