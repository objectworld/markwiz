// 버전은 package.json이 원본이다. src-tauri/Cargo.toml, tauri.conf.json과 같아야 하며 appInfo.test.ts가 검증한다.
import { version } from '../package.json';

export const APP_NAME = 'Markwiz';
export const APP_VERSION: string = version;
export const APP_LICENSE = 'LGPL-2.1-only';
export const APP_AUTHOR = 'objectworld';
export const APP_REPOSITORY = 'https://github.com/objectworld/markwiz';

export const APP_STACK = 'Tiptap · React · Tauri · Mermaid · PlantUML';
