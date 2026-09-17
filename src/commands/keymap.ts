import defaultKeymap from './keymap.json';
import type { CommandId } from './commandIds';

export type Platform = 'mac' | 'win';

export interface KeymapEntry {
  win: string;
  mac: string;
}

export type KeymapConfig = Record<CommandId, KeymapEntry>;

// keymap.json은 이 프로젝트의 단축키 단일 소스다. 사용자는 이 파일을 직접
// 수정해 재매핑할 수 있고(데스크탑에서는 M5에서 사용자 설정 디렉터리의
// 동일한 형식 파일을 가리키도록 교체될 예정), 그 전까지 웹에서는 로컬
// 오버라이드를 localStorage에 저장해 즉시 재매핑을 반영한다.
export const KEYMAP_SOURCE_PATH = 'src/commands/keymap.json';
const OVERRIDE_STORAGE_KEY = 'markwiz:keymap-overrides';

export function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'win';
  const platform = navigator.platform ?? '';
  const userAgent = navigator.userAgent ?? '';
  return /Mac|iPhone|iPad|iPod/.test(platform) || /Mac OS X/.test(userAgent) ? 'mac' : 'win';
}

function readOverrides(): Partial<KeymapConfig> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(OVERRIDE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<KeymapConfig>) : {};
  } catch {
    return {};
  }
}

export function loadKeymap(): KeymapConfig {
  const overrides = readOverrides();
  return { ...(defaultKeymap as KeymapConfig), ...overrides };
}

export function setKeymapOverrides(overrides: Partial<KeymapConfig>): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(overrides));
}

export function getShortcutForPlatform(entry: KeymapEntry, platform: Platform = detectPlatform()): string {
  return platform === 'mac' ? entry.mac : entry.win;
}
