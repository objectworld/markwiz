import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    globals: true,
    // mermaid 같은 큰 라이브러리를 처음 불러오는 테스트는 파일을 병렬로 돌릴 때 기본 5초를 넘기기도 한다.
    testTimeout: 30_000,
  },
});
