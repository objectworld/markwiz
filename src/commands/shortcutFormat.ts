// 사람이 읽는 "Cmd+Control+1" 형식의 조합 문자열을 ProseMirror의
// addKeyboardShortcuts() DSL("Cmd-Control-1")로 변환한다.
// prosemirror-keymap은 Ctrl/Control/Cmd/Meta/Alt/Shift 토큰을 대소문자 구분
// 없이 그대로 인식하고 내부적으로 정규화하므로, 별도의 별칭 테이블 없이
// 구분자만 '+'에서 '-'로 바꾸면 된다. 단, 알파벳 한 글자 키는 소문자로
// 써야 Shift가 눌린 것으로 오해되지 않는다.
export function toProseMirrorShortcut(combo: string): string {
  const parts = combo.split('+').map((part) => part.trim());
  const key = parts[parts.length - 1];
  const normalizedKey = /^[a-zA-Z]$/.test(key) ? key.toLowerCase() : key;
  return [...parts.slice(0, -1), normalizedKey].join('-');
}

const TAURI_MODIFIER_ALIASES: Record<string, string> = {
  ctrl: 'Ctrl',
  control: 'Ctrl',
  cmd: 'Cmd',
  command: 'Cmd',
  alt: 'Alt',
  option: 'Alt',
  shift: 'Shift',
};

// Tauri 네이티브 메뉴 accelerator 형식("Ctrl+Shift+S")으로 변환한다.
// ProseMirror DSL과 달리 알파벳 키는 대문자로 쓴다.
export function toTauriAccelerator(combo: string): string {
  const parts = combo.split('+').map((part) => part.trim());
  const key = parts[parts.length - 1];
  const modifiers = parts.slice(0, -1).map((mod) => TAURI_MODIFIER_ALIASES[mod.toLowerCase()] ?? mod);
  const normalizedKey = key.length === 1 ? key.toUpperCase() : key;
  return [...modifiers, normalizedKey].join('+');
}
