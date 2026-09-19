import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { CSP } from './csp';

// dev 서버는 React Refresh용 인라인 스크립트가 필요해 CSP를 걸 수 없으므로 빌드에만 삽입한다.
function cspMetaPlugin(): Plugin {
  return {
    name: 'markwiz-csp-meta',
    apply: 'build',
    transformIndexHtml: (html) =>
      html.replace('<head>', `<head>\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`),
  };
}

export default defineConfig({
  plugins: [react(), cspMetaPlugin()],
  // 워커 안에서 @plantuml/core를 동적 import(코드 스플리팅)하려면 ES 포맷이어야 한다.
  worker: { format: 'es' },
});
