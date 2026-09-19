import { describe, expect, it } from 'vitest';
import { CSP } from '../csp';
import tauriConfigRaw from '../src-tauri/tauri.conf.json?raw';

describe('CSP', () => {
  it('keeps the web build and Tauri policies identical', () => {
    const tauriConfig = JSON.parse(tauriConfigRaw);
    expect(tauriConfig.app.security.csp).toBe(CSP);
  });

  it('allows WebAssembly (PlantUML/Graphviz) and same-origin workers', () => {
    expect(CSP).toContain("script-src 'self' 'wasm-unsafe-eval'");
    expect(CSP).toContain("worker-src 'self'");
  });
});
