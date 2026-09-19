# Markwiz — 프로젝트 사양

## 목표
Typora와 동등한 사용 경험을 제공하는 마크다운 WYSIWYG 에디터를, 웹과 데스크탑 양쪽에서
동작하는 단일 코드베이스로 구축한다. Tiptap(ProseMirror 기반)을 에디터 엔진으로 사용한다.

## 기술 스택 (고정)
- 언어: TypeScript
- UI 프레임워크: React
- 에디터 엔진: Tiptap (@tiptap/core, @tiptap/react, @tiptap/starter-kit)
- 데스크탑 래퍼: Tauri (Rust 기반, 경량 우선)
- 스타일링: Tailwind CSS
- 마크다운 파싱/직렬화: Tiptap의 마크다운 확장 또는 markdown-it 조합 (직렬화 왕복 무손실 검증 필수)
- 패키지 매니저: pnpm

## 핵심 요구사항

### 1. WYSIWYG 마크다운 편집 (Typora 동작 재현)
- 마크다운 문법(`# `, `**`, `- `, `> `, ` ``` `, `[]()` 등)을 입력하는 즉시 서식으로 변환
  (Tiptap `inputRules` 활용)
- 커서가 해당 블록에 있을 때만 원본 마크업 문자를 노출하고, 벗어나면 숨김
  (decoration 기반, Typora의 "포커스 라인만 raw 문법 노출" 동작과 동일하게)
- 지원 문법: 헤딩(H1-H6), 굵게/기울임/취소선, 인용, 순서/비순서 리스트, 체크박스,
  코드블록(구문 강조 포함), 표(GFM), 링크, 이미지, 수평선, 각주

### 2. 파일 시스템 연동 (데스크탑)
- Tauri의 Rust 파일시스템 API로 `.md` 파일 열기/저장/다른 이름으로 저장
- 저장 시 Tiptap 문서 트리 → 마크다운 텍스트 직렬화
- 불러오기 시 마크다운 텍스트 → Tiptap 문서 트리 파싱
- 왕복 변환 시 원본과 100% 동일해야 함 (round-trip 테스트 작성)

### 3. Typora 동일 단축키 (완성도 최우선)
아래 구조로 구현할 것 — 임의 구조로 바꾸지 말 것:

1. `src/commands/registry.ts` : 커맨드 ID → 실행 함수의 단일 레지스트리
   예) `format.bold`, `format.heading1`, `file.save`, `view.outline` 등
2. `src/commands/keymap.json` : 커맨드 ID별 Windows/Linux, macOS 단축키 매핑 데이터
   (아래 Typora 공식 단축키 표를 정확히 반영 — 단순 Ctrl→Cmd 치환 금지,
   macOS에서 `Cmd+Control+숫자`처럼 조합 자체가 다른 경우가 있으므로 개별 지정)

   | 커맨드 | Windows/Linux | macOS |
   |---|---|---|
   | file.new | Ctrl+N | Cmd+N |
   | file.save | Ctrl+S | Cmd+S |
   | file.saveAs | Ctrl+Shift+S | Cmd+Shift+S |
   | format.bold | Ctrl+B | Cmd+B |
   | format.italic | Ctrl+I | Cmd+I |
   | format.clearFormat | Ctrl+\ | Cmd+\ |
   | format.heading1~6 | Ctrl+1~6 | Cmd+1~6 |
   | view.toggleSidebar | Ctrl+Shift+L | Cmd+Shift+L |
   | view.outline | Ctrl+Shift+1 | Cmd+Control+1 |
   | view.sourceMode | Ctrl+/ | Cmd+/ |
   | view.focusMode | F8 | F8 |
   | view.typewriterMode | F9 | F9 |

   (전체 목록은 https://support.typora.io/Shortcut-Keys/ 참고하여 빠짐없이 매핑)

3. 앱 레벨 단축키(파일/뷰 관련)는 Tauri의 네이티브 메뉴 accelerator에 바인딩
4. 서식 레벨 단축키(굵게/헤딩 등)는 Tiptap `addKeyboardShortcuts()`에 `Mod-` 접두사로 바인딩
   (Mod는 플랫폼에 따라 Cmd/Ctrl 자동 변환됨을 활용하되, 표에서 조합 자체가 다른 항목은
   플랫폼 분기 처리)
5. 두 바인딩 레이어 모두 registry.ts의 동일 커맨드 ID를 참조해야 함 (중복 로직 금지)
6. 사용자가 `keymap.json`을 직접 수정해 재매핑할 수 있도록 설정 파일 경로를 노출

### 4. 다이어그램 지원 — Mermaid + PlantUML (둘 다 클라이언트 사이드, 서버 불필요)

둘 다 브라우저/웹뷰 내에서만 렌더링하고, 별도 백엔드 서버를 두지 않는다.

**공통 구조**
- Tiptap 커스텀 Node로 ` ```mermaid `, ` ```plantuml ` 코드블록을 각각 감지, NodeView로 렌더링
- 코드블록 내용이 바뀔 때마다 디바운스(약 300~500ms) 처리 후 재렌더링
- 렌더링 실패 시 에러 메시지를 다이어그램 영역에 표시하고, 원본 코드는 항상 편집 가능한 상태 유지
- 코드/렌더링 결과 토글 버튼 제공 (Typora의 다이어그램 표시 방식과 동일)

**Mermaid**
- `mermaid` npm 패키지를 그대로 사용 (경량, 초기 로드 시 함께 포함해도 무방)
- `mermaid.render()` API로 SVG 문자열을 얻어 NodeView에 삽입

**PlantUML**
- 공식 `plantuml.js` (TeaVM으로 PlantUML Java 코드베이스를 JS로 컴파일한 프로젝트) 사용
- 필요한 스크립트(`plantuml.js`, `viz-global.js`, 합산 약 8MB)는 앱 초기 로드에 포함하지 말고,
  **문서 안에 실제로 ` ```plantuml ` 코드블록이 처음 등장할 때 동적 import로 지연 로딩**할 것
  (`import()` dynamic import 또는 Tiptap extension의 lazy init 패턴 사용)
- WebAssembly를 실행하므로, Tauri의 CSP 설정에서 `script-src`에 `'wasm-unsafe-eval'`을 허용해야 함
  (Tauri `tauri.conf.json`의 `security.csp` 항목에 반영)
- 웹 배포판에서도 동일하게 CSP 헤더에 WebAssembly 허용 설정 필요
- 렌더링은 워커 스레드(Web Worker)에서 수행하여 메인 UI 스레드 블로킹을 방지할 것
  (특히 클래스/컴포넌트/배치 다이어그램처럼 Graphviz 레이아웃 연산이 무거운 경우 중요)

### 5. 웹/데스크탑 공통 코드베이스
- React 컴포넌트 계층은 웹/데스크탑 100% 공유
- 파일시스템 접근, 네이티브 메뉴 등 플랫폼 종속 기능만 `src/platform/web/`과
  `src/platform/desktop/` 로 분리하고 동일 인터페이스로 추상화
  (예: `PlatformAPI.saveFile()`을 웹에서는 다운로드로, 데스크탑에서는 Tauri fs로 구현)

## 진행 방식 (중요)
1. 먼저 위 요구사항을 바탕으로 프로젝트 디렉토리 구조와 마일스톤 계획을 제안할 것
   (바로 코드를 작성하지 말고, 계획을 먼저 보여주고 확인받을 것)
2. 계획 승인 후 다음 순서로 구현:
   ① 기본 Tiptap 에디터 셋업 (React + StarterKit)
   ② 마크다운 문법 실시간 변환 + decoration 기반 raw 노출/숨김
   ③ 커맨드 레지스트리 + 키맵 구조 (Typora 단축키 표 전체 반영)
   ④ 마크다운 직렬화/파싱 (round-trip 테스트 포함)
   ⑤ Tauri 데스크탑 래핑 + 파일 시스템 연동
   ⑥ Mermaid 커스텀 노드 확장 (클라이언트 사이드)
   ⑦ PlantUML 커스텀 노드 확장 (지연 로딩 + Web Worker 기반 클라이언트 사이드)
3. 각 단계마다 실행 가능한 상태로 커밋하고, 테스트(가능하면 Vitest)를 함께 작성할 것

## 비목표 (지금 범위에 포함하지 않음)
- 실시간 협업(Yjs/CRDT) — 추후 별도 단계
- 서버 동기화(SaaS 계정/클라우드 저장) — 추후 별도 단계
- 모바일 앱
