# Markwiz

Typora 스타일의 WYSIWYG 마크다운 에디터. Tiptap(ProseMirror) 기반으로,
Mermaid와 PlantUML 다이어그램을 서버 없이 클라이언트 사이드에서 렌더링합니다.
웹과 데스크탑(Tauri) 양쪽에서 동일한 코드베이스로 동작합니다.

## Features

- 📝 실시간 WYSIWYG 마크다운 편집 — 마크다운 문법을 즉시 서식으로 변환
- 📊 Mermaid / PlantUML 다이어그램 코드블록 지원 (서버 불필요, 완전 클라이언트 사이드)
- ⌨️ Typora와 동일한 단축키 지원
- 🖥️ 웹 브라우저 + 데스크탑 앱(Windows/macOS/Linux) 동시 지원
- 🔓 100% 오픈소스 (MIT License)

## Tech Stack

- **Editor Engine**: [Tiptap](https://tiptap.dev) (ProseMirror)
- **UI**: React + TypeScript + Tailwind CSS
- **Desktop**: [Tauri](https://tauri.app)
- **Diagrams**: [Mermaid](https://mermaid.js.org), [plantuml.js](https://github.com/plantuml/plantuml.js) (TeaVM)

## Status

🚧 초기 개발 단계입니다. 로드맵은 [Issues](../../issues)를 참고해 주세요.

## Getting Started

```bash
pnpm install
pnpm dev        # 웹 개발 서버
pnpm tauri dev  # 데스크탑 앱 개발 모드
```

## License

MIT © [objectworld](https://github.com/objectworld)
