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
- npm 패키지 **`@plantuml/core`** (TeaVM으로 PlantUML Java 코드베이스를 JS로 컴파일, MIT) 사용.
  GitHub `plantuml/plantuml.js` 저장소는 CheerpJ 기반의 별개 프로젝트(PNG 전용)라 이 사양과 맞지 않는다
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

### 6. 화면 구성 — MS Word 스타일 리본 툴바 + 하단 상태바
구현 위치: `src/ribbon/` (`Ribbon.tsx`, `RibbonButton.tsx`, `ribbonActions.ts`, `StatusBar.tsx`),
레이아웃은 `src/editor/Editor.tsx`.

- **제목 표시줄**: 빠른 실행 도구(저장 / 실행 취소 / 다시 실행) + `문서이름 - Markwiz`
- **툴바는 탭 없이 한 줄**(홈/삽입 탭으로 나누지 말 것). 그룹 순서와 구성:
  - 파일: 새로 만들기, 열기, 저장, 다른 이름으로 저장
  - 글꼴: **스타일 드롭다운**(본문, 제목 1~6) + 굵게, 기울임, 취소선, 인라인 코드, 서식 지우기
    (스타일은 별도 그룹이 아니라 글꼴 그룹 안에 둔다)
  - 단락: 글머리 기호, 번호 매기기, 확인란 목록, 인용
  - 삽입: 표, 그림, 링크, 코드 블록, 구분선, 각주
  - 다이어그램: Mermaid, PlantUML (템플릿 코드블록 삽입)
- 버튼은 아이콘만 표시하고(lucide-react) 이름/단축키는 툴팁으로: 단축키는 `keymap.json`에서 읽어 `굵게 (Ctrl+B)`처럼 표시
- 커서 위치의 서식은 버튼 강조(`aria-pressed`), 실행 취소/다시 실행은 기록이 없으면 비활성화
- 레지스트리에 등록된 동작은 반드시 `executeCommand()`로 실행(로직 중복 금지). 단축키가 없는 삽입/실행 취소
  계열만 에디터 커맨드를 직접 호출. 버튼 `mousedown`은 `preventDefault`해서 에디터 선택 영역을 유지
- **상태바**: 문서 이름, 단어 수, 글자 수(공백 제외, 툴팁에 공백 포함), 선택 글자 수(선택 시에만), 현재 블록 종류
  (본문 / 제목 N / 목록 / 인용 / 코드 블록 / 표 …)
- 작업 영역 위에 흰 종이 한 장이 놓인 Word 레이아웃. 문서 타이포그래피(제목 크기, 목록 기호, 표 테두리)는
  Tailwind preflight가 지우므로 `src/styles/editor.css`에서 다시 정의한다
- **색상은 Claude 앱 팔레트**(라이트 테마만). 값은 `src/styles/globals.css`의 Tailwind 테마 토큰
  (`chrome`, `chrome-hover`, `chrome-border`, `canvas`, `ink`, `ink-muted`, `accent`)에 한 곳으로만 정의하고
  컴포넌트에 색상 코드를 하드코딩하지 말 것. (히스토리: 파랑 → 진한 회색 → Claude 앱 색으로 변경됨)

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
- 코드 서명 — 보류(아래 "빌드 / 배포" 참고)
- `view.*`는 `src/commands/viewCommands.ts`가 등록하고 상태는 `viewState.ts`가 소유한다. 사이드바는 개요 패널뿐이고
  (`toggleSidebar`/`outline`이 같은 패널을 토글), 소스 모드는 textarea 편집 후 끌 때 파싱해 반영한다.
  에디터에 포커스가 없어도 view 단축키가 먹도록 `Editor.tsx`에 window keydown 리스너가 있다(`defaultPrevented`면 건너뜀).
- **메뉴**: 리본과 같은 그룹/항목(파일 / 편집 / 글꼴 / 단락 / 삽입 / 다이어그램 / 보기) + 끝에 **도움말**(README 보기).
  단, 리본의 "내보내기" 그룹은 메뉴에서 최상위가 아니라 **파일 > 내보내기 서브메뉴**다(`EXPORT_MENU_TEXT`, 같은 `exportActions`를 재사용).
  `src/menu/menuModel.ts`가 `ribbonActions.ts`에서 모델을 만들고(리본에 항목을 추가하면 메뉴에도 자동 반영),
  Windows/Linux 데스크탑은 앱 안 `MenuBar`(툴바와 같은 `chrome` 색)로, macOS는 네이티브 메뉴(`platform/desktop/menu.ts`)로 그린다.
  Windows 네이티브 메뉴 바는 OS가 흰색으로 그려 색을 바꿀 수 없어서 앱 안 메뉴 바로 바꿨다(Alt+문자 니모닉은 없음).
  웹에는 메뉴 바가 없다(리본만) — 그래서 웹에서는 도움말에 접근할 수 없다.
  앱 안 메뉴 바/웹에서는 파일·보기 단축키를 `Editor.tsx`의 window keydown 리스너가 처리한다(에디터가 처리한 키는 건너뜀).
  서식 항목은 accelerator 없이 단축키 표시만 한다(Tiptap 키맵과 이중 실행 방지).
- **파일 > 최근에 연 파일**(최대 10개, `MAX_RECENT_FILES`): 목록은 `src/commands/recentFiles.ts`가 localStorage(`markwiz:recent-files`)에 두고
  `useRecentFiles`로 구독한다. 메뉴 모델은 `buildMenuModel(keymap, recentFiles)`가 서브메뉴로 만들고 `MenuBar`가 목록이 바뀔 때 다시 만든다
  (macOS 네이티브 메뉴는 `installNativeMenu`가 구독해서 통째로 다시 설정, 반환값이 구독 해제 함수). 기록은 `file.open`/`file.save*`에서
  `rememberFile`이 하며, **`PlatformAPI.openFileAt`이 있는 플랫폼(데스크탑)에서만** 기록한다(웹의 "경로"는 파일명일 뿐이라). 여는 함수는
  `fileCommands.openRecentFile` — 열기 실패 시 목록에서 빼고 `showNotice`(상태바 안내)로 알린다. 경로 비교는 윈도우 경로면 대소문자/`\`·`/` 무시.
  레지스트리 커맨드가 아니라 메뉴 항목의 `run` 클로저다(경로 인자가 필요하고 단축키가 없어서)
- **`.md`/`.markdown` 파일 연결**: `tauri.conf.json`의 `bundle.fileAssociations`(NSIS/MSI가 설치 시 등록; `markwiz.exe` 단독 실행에는
  적용 안 됨). `description`은 반드시 ASCII만 쓴다 — WiX(MSI)의 기본 코드페이지(1252)가 한글을 못 담아 `light.exe`가
  `LGHT0311`로 조용히 실패한다(에러 메시지 자체는 상세하되 기본 `pnpm tauri build` 로그엔 안 보임, `--verbose` 필요).
  실행 파일이 파일 경로를 인자로 받았을 때 실제로 그 문서를 여는 것은 별도 배선: Rust `lib.rs`가 `tauri-plugin-single-instance`를
  **맨 처음** 플러그인으로 등록(두 번째 실행이 인자를 콜백으로 넘기고 새 창 없이 종료 — 이 창 포커스 로직도 여기서),
  최초 실행 인자는 `StartupFile` managed state에 담아 `take_startup_file` 커맨드로 한 번만 꺼내 간다.
  프런트는 `platform/desktop/startupFile.ts`가 마운트 시 `take_startup_file`을 부르고 `open-file` 이벤트(2차 실행분)를 구독,
  두 경로 모두 `fileCommands.openRecentFile`로 위임해 최근 파일 기록/실패 처리 로직을 그대로 재사용한다.
  **연결 확인 체크박스 — NSIS**: 원본 템플릿(tauri-cli-v2.11.4, `gh api repos/tauri-apps/tauri/contents/...`로 받음)은 확인 없이
  무조건 연결한다. `src-tauri/nsis/installer.nsi`에 커스텀 페이지(`Var AssociateFiles` + `Page custom PageFileAssociation …`,
  StartMenu 페이지와 Install 페이지 사이, `{{#if file_associations}}`로 감쌈)를 추가하고 `bundle.windows.nsis.template`으로 연결했다.
  `.onInit`에서 `$AssociateFiles`를 기본 체크(`BST_CHECKED`)로 초기화해야 한다 — 안 하면 무인 설치(`/P`, 이 페이지가
  `SkipIfPassive`로 생략됨)에서 값이 빈 문자열로 남아 연결이 전혀 안 된다(이전 버전 대비 회귀). 새 LangString(`mwAssocQuestion` 등)은
  `${LANG_ENGLISH}`에만 정의(현재 `languages` 기본값이 `["English"]`라서) — 언어를 늘리면 여기도 추가해야 한다.
  **연결 확인 체크박스 — MSI(WiX)**: 같은 방식으로 `tauri-cli-v2.11.4`의 원본 `main.wxs`를 받아 `src-tauri/msi/main.wxs`로
  커스터마이징하고 `bundle.windows.wix.template`으로 연결했다. `ASSOCIATEMD` Property(기본값 `"1"`)를 만들고, `WixUI_InstallDir`의
  InstallDirDlg/VerifyReadyDlg 사이에 체크박스가 있는 `FileAssocDlg`를 끼워 넣었다(같은 파일에 이미 있던 라이선스
  건너뛰기 블록처럼, 기본 `Publish` 규칙을 더 높은 `Order`로 덮어쓰는 방식). **파일 연결 항목은 실행 파일(`Path`)
  컴포넌트에서 분리한 별도 `FileAssociations` 컴포넌트**에 두고 `<Condition>ASSOCIATEMD</Condition>`을 건다 — 안 그러면 체크
  해제 시 실행 파일 자체가 설치되지 않는다. 또한 원본의 `ProgId Advertise="yes"`/`Extension Advertise="yes"` 방식은 그
  컴포넌트의 키패스가 반드시 File이어야 한다는 WiX 제약(ICE19)이 있어 조건부 컴포넌트에 못 쓰므로, 같은 효과를 내는
  일반 `RegistryKey`/`RegistryValue`(`HKCR`, perMachine 설치에서 `HKLM\Software\Classes`로 매핑됨)로 직접 썼다.
  MSI는 무인 설치(`/qn`, `/qb`)에서 UI 시퀀스 자체를 건너뛰므로 NSIS와 달리 별도 스킵 처리가 필요 없다(Property 기본값이
  그대로 적용됨)
- **도움말**: `HelpDialog`가 `README.md?raw`를 읽기 전용 에디터로 보여준다. 사용자 문서와 별개 인스턴스이며
  `commandKeymap`/`focusLineDecoration`을 뺀다(넣으면 Ctrl+S가 README를 저장함). raw HTML 배너는 제거하고 이미지 경로를 번들 URL로 바꾼다
- **도움말 > Markwiz 정보**(`AboutDialog`): 버전은 `src/appInfo.ts`가 package.json에서 읽고, 소개글·라이선스도 그 파일에 둔다.
  `appInfo.test.ts`가 package.json / Cargo.toml / tauri.conf.json 버전이 같은지 검사한다
- 창 제목(파일명)은 `document.title`로는 Tauri 창에 반영되지 않아 `platform/desktop/windowTitle.ts`가 창 API로 설정한다
- 미연결: `!theme`, PlantUML 표준 라이브러리 번들, 다크 모드

## 진행 현황
- ①~⑦ 마일스톤 모두 완료, 이어서 리본 툴바 + 상태바(섹션 6) 완료. 테스트는 Vitest(201개) + Rust `cargo test`(3개), `pnpm test`
- 현재 버전 **0.1.2**(2026-09-23). 이전: 0.1.1(2026-09-23), 0.1.0(2026-09-20 첫 릴리즈). 버전은 `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` 세 곳을
  함께 올리고 README의 버전/릴리즈 노트/설치 파일명도 같이 갱신한다. 릴리즈는 `v0.1.0` 형식의 git 태그
- 원격: `origin/main` (github.com/objectworld/markwiz)

## 구현 결정 (코드만 봐서는 알기 어려운 것)
- **마크다운 round-trip**: `prosemirror-markdown` + `markdown-it`(+footnote)로 직접 구현(`src/markdown/`).
  Tiptap 3.31 core에 `parseMarkdown/renderMarkdown` 필드가 있으나 공개 소비 API가 없어 쓰지 않음.
  새 커스텀 노드/마크를 추가하면 `serializer.ts`와 `parser.ts`에 수동 등록해야 한다(자동 유도 안 됨)
- **단축키 단일 소스**: StarterKit/개별 확장이 내장한 단축키는 `addKeyboardShortcuts: () => ({})`로 모두 비우고
  `CommandKeymap`(keymap.json → registry) 하나만 바인딩한다. 안 그러면 keymap.json 재매핑이 무력화됨.
  네이티브 메뉴 accelerator도 같은 keymap.json을 `toTauriAccelerator`로 변환해 사용
- **다이어그램은 별도 노드 타입이 아니라 `codeBlock` + `language`** 기반 NodeView(`DiagramView`)다. 그래서
  M4 round-trip을 그대로 재사용한다. NodeView 규칙: 미리보기 영역은 `contentEditable={false}`,
  `NodeViewContent`는 항상 마운트(CSS로만 숨김), **빈 블록은 코드 모드로 시작**(소스가 `display:none`이면
  생성 직후 커서 배치가 실패해 문서 맨 앞으로 튐)
- **PlantUML**: 엔진이 `window`/`document`(createElementNS, XMLSerializer, DOMParser)와 SVG `getBBox`/canvas
  측정을 직접 호출하므로 순수 Web Worker에서는 안 돈다 → `src/workers/plantumlWorkerShims.ts`가
  `@xmldom/xmldom` + `OffscreenCanvas`로 채운다. `viz-global.js`(UMD)는 번들 시 `globalThis.Viz`가 설정되지 않아
  엔진이 조용히 Smetana 레이아웃으로 폴백하므로 로더가 명시적으로 연결한다(회귀 테스트 있음 — 콘솔에
  "falling back to the Smetana" 메시지가 뜨면 안 됨). 결과 SVG는 DOMPurify로 sanitize 후 삽입
- **CSP 단일 소스**: `csp.ts`. 웹 빌드는 vite 플러그인이 index.html에 meta로 삽입(dev 서버 제외),
  `src-tauri/tauri.conf.json`의 `security.csp`는 같은 값을 복제하고 `src/csp.test.ts`가 일치를 검증.
  `'wasm-unsafe-eval'`과 `worker-src 'self'` 필수
- Tiptap `Image`는 기본이 block 노드라 `inline: true`로 설정(문단 안에서 텍스트와 섞이려면 필요)
- 에디터가 `null`에서 생성되는 시점에 `useEditorState` 초기 스냅샷이 갱신되지 않으므로 `Ribbon`/`StatusBar`에
  서로 다른 `key`를 줘서 재마운트한다(같은 key를 쓰면 형제 요소가 중복 렌더링됨)
- **링크/이미지 삽입**은 `window.prompt`가 아니라 `InsertDialog`(주소 입력 + 파일 선택)다. `format.hyperlink`/`format.image` 커맨드는
  `viewState.insert`만 채워 창을 연다. 파일 선택은 `PlatformAPI.pickLocalFile`(데스크탑: dialog 플러그인 → `file:///` URL,
  웹: 이미지만 data URL·1MB 제한). 로컬 파일은 마크다운에 `file:///C:/…`(경로 인코딩)로 저장한다 — 이를 위해
  ① markdown-it `validateLink`에 `file:` 추가(안 하면 재열기 시 링크/이미지가 깨짐), ② Tiptap Link `protocols: ['file']`,
  ③ 이미지 `renderHTML`이 `file://`을 `convertFileSrc`(asset 프로토콜)로 바꿔 그린다(문서 값은 그대로).
  asset 프로토콜은 `tauri` 크레이트의 `protocol-asset` feature + `tauri.conf.json`의 `assetProtocol`(scope `**`, fs scope와 동일 수준) +
  CSP `img-src`의 `asset: http://asset.localhost`가 모두 있어야 동작한다.
  **상대 경로**: 문서 폴더 또는 그 하위 폴더의 파일은 삽입 시 `relativizeLocalUrl`이 `./img/a.png`(항상 `./` 접두, `normalizeUrl`이 `a.png`를
  도메인으로 오해하지 않게)로 바꿔 저장한다. 상위 폴더/다른 곳/저장 전 문서는 절대 `file://` 유지. 화면 표시는 `resolveDisplaySrc(src, 문서경로)`가
  상대 경로를 문서 폴더 기준으로 풀어 asset URL로 바꾼다 — 그래서 `file.open`은 **문서 경로를 먼저 갱신한 뒤** 내용을 넣어야 한다(순서 바꾸지 말 것).
  Save As로 폴더가 바뀌어도 기존 상대 경로는 재작성하지 않는다 외부 `http:` 이미지도 보이도록 `img-src`에 `http:`를 허용했다
- **PDF/Word 내보내기**(`src/export/`, 툴바·메뉴의 "내보내기" 그룹). `insert.*`처럼 레지스트리 커맨드가 아니라 `ribbonActions.ts`의
  `run` 클로저다(단축키 없는 단발성 동작).
  - **PDF**(`exportPdf.ts`): 별도 라이브러리 없이 `window.print()`. 소스 코드 모드면 `view.sourceMode` 커맨드로 먼저 미리보기로
    돌아가고(파싱 실패 시 `showNotice`로 알리고 인쇄하지 않음), 화면 구성은 `editor.css`의 `@media print`가 담당한다
    (메뉴/툴바/사이드바/상태바/raw 마커 숨김, 다이어그램은 토글 상태와 무관하게 항상 `.markwiz-diagram-preview` 강제 표시).
  - **Word**(`exportDocx.ts` + `docxConvert.ts`): `docx` 패키지로 문서 트리를 직접 `.docx`로 변환한다(마크다운 재파싱이 아니라
    ProseMirror 노드를 그대로 순회). **PlantUML처럼 무거워서 동적 `import('docx')`로만 쓴다** — `docxConvert.ts`는 `docx`를
    정적으로 import하지 않고 `DocxLib`(`typeof import('docx')`) 타입 값을 `ConvertContext.docx`로 주입받는다(정적 import 시
    웹 번들에 `docx` 전체가 섞여 들어감). 목록은 문서 안에서 서로 다른 목록이 번호를 이어받지 않도록 최상위 목록마다
    새 numbering reference를 만들고(`allocateListRef`), 중첩 하위 목록은 부모 reference를 그대로 물려받는다 — 이렇게 안 하면
    docx 라이브러리가 같은 reference의 카운터를 문서 전체에서 공유해 버린다. 체크박스 목록은 네이티브 numbering을 안 쓰고
    `☐`/`☑` 글자를 붙인다. 각주는 `Document({ footnotes })` + `FootnoteReferenceRun`으로 진짜 Word 각주가 된다.
    이미지/다이어그램은 **이미 화면에 렌더링된 DOM에서 캔버스로 래스터화**한다(`collectImages.ts` + `rasterize.ts`) —
    `editor.view.nodeDOM(pos)`로 그 노드의 실제 DOM을 찾아(문서 위치 기반이라 다이어그램 오류/미렌더링으로 svg가
    없는 블록이 섞여도 순서가 어긋나지 않는다) 이미지는 캔버스 `drawImage`+`toDataURL`, 다이어그램은 svg를
    `data:image/svg+xml`로 만든 `Image`를 캔버스에 그려 PNG로 만든다(비동기 — 이미지 수집은 트리 생성 전에 먼저 끝낸다).
    두 번째 네트워크 요청이 없어 CSP `connect-src`와 무관하고 `file://`/`asset://`/`data:` 이미지는 항상 되지만,
    CORS를 안 여는 외부 `https:` 이미지는 캔버스가 오염돼(`SecurityError`) 읽을 수 없다 — 이 경우 텍스트 대체로 내려간다.
  - 이진 파일 저장을 위해 `PlatformAPI.saveBinaryFileAs`를 추가했다(데스크탑: `writeFile`, `fs:allow-write-file` 권한 필요;
    웹: Blob 다운로드). 테스트는 `docx`가 실제로 만든 `.docx`(zip)를 `jszip`(devDependency, 프로덕션 번들에는 안 들어감)으로
    열어 `word/document.xml`/`footnotes.xml`/`numbering.xml` 내용을 검사한다(마크다운 round-trip 테스트와 같은 취지)

## 빌드 / 배포
- 개발 `pnpm dev`, 웹 빌드 `pnpm build`, 데스크탑 `pnpm tauri build` (Tauri v2, Rust + MSVC Build Tools 필요 — 설치됨)
- 산출물: `src-tauri/target/release/` 의 `markwiz.exe`, `bundle/nsis/*-setup.exe`, `bundle/msi/*.msi` (x64 전용)
- `markwiz.exe`가 실행 중이면 덮어쓰기가 실패한다. 사용자의 실행 중인 앱을 강제 종료하지 말고, 사용자가 닫게 하거나
  `CARGO_TARGET_DIR`을 다른 폴더로 지정해 빌드한다(전체 재컴파일 약 8분, 1.5GB)
- 코드 서명은 하지 않는다(사용자가 보류 결정). 서명 시 SmartScreen 경고가 사라지지 않는 자체 서명은 의미가 적고,
  OV/EV/Azure Trusted Signing이 필요. 적용하려면 `tauri.conf.json`의 `bundle.windows`에 설정
- exe 단독 실행은 가능하나 대상 PC에 WebView2 런타임이 있어야 한다(설치 프로그램은 자동 설치). VC++ 재배포
  패키지는 불필요. `Cargo.lock`은 애플리케이션이므로 커밋한다

## 작업 규칙
- 커밋과 push는 사용자가 요청할 때만 한다 (지금까지 요청 시에만 진행함)
- 화면 확인은 **브라우저 탭 스크린샷만** 사용한다. 데스크탑 전체 화면 캡처는 하지 않는다 — 무관한 개인 창(증권 앱 등)이
  찍힌 적이 있다. 네이티브 창 자체는 시각 검증이 불가능하므로 그 사실을 명시한다
- UI 변경은 실제 브라우저에서 동작을 확인한 뒤 완료로 보고한다. 브라우저 자동화의 Enter/타이핑 입력은 불안정하므로
  결과를 DOM으로 확인하고 안 되면 재시도한다
