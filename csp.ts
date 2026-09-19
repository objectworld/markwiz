// 웹 빌드(index.html의 meta)와 Tauri(src-tauri/tauri.conf.json의 security.csp)가 공유하는 CSP.
// - 'wasm-unsafe-eval': PlantUML의 Graphviz(viz-global.js)가 WebAssembly를 실행한다.
// - worker-src 'self': PlantUML 렌더링 Web Worker는 같은 출처의 번들 파일이다.
// tauri.conf.json은 JSON이라 이 상수를 import할 수 없으므로 값을 복제하고,
// src/csp.test.ts가 두 값이 항상 같은지 검증한다.
export const CSP = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "worker-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https: blob:",
  "connect-src 'self'",
].join('; ');
