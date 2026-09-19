// 버전은 package.json이 원본이다. src-tauri/Cargo.toml, tauri.conf.json과 같아야 하며 appInfo.test.ts가 검증한다.
import { version } from '../package.json';

export const APP_NAME = 'Markwiz';
export const APP_VERSION: string = version;
export const APP_LICENSE = 'LGPL-2.1-only';
export const APP_AUTHOR = 'objectworld';
export const APP_REPOSITORY = 'https://github.com/objectworld/markwiz';

export const APP_DESCRIPTION =
  'Typora 스타일의 WYSIWYG 마크다운 에디터입니다. 마크다운 문법을 입력하는 즉시 서식으로 바뀌고, ' +
  'Mermaid와 PlantUML 다이어그램을 서버 없이 그 자리에서 그려 줍니다. ' +
  '웹 브라우저와 데스크탑(Tauri)에서 같은 코드로 동작하며, 저장한 마크다운은 다시 열어도 그대로 유지됩니다.';

export const APP_STACK = 'Tiptap · React · Tauri · Mermaid · PlantUML';
