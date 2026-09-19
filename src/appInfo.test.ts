import { describe, expect, it } from 'vitest';
import cargoToml from '../src-tauri/Cargo.toml?raw';
import tauriConfigRaw from '../src-tauri/tauri.conf.json?raw';
import { APP_VERSION } from './appInfo';

describe('app version', () => {
  it('is a semver version', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('is the same in package.json, Cargo.toml, and tauri.conf.json', () => {
    const cargoVersion = /^version = "([^"]+)"/m.exec(cargoToml)?.[1];
    expect(cargoVersion).toBe(APP_VERSION);
    expect(JSON.parse(tauriConfigRaw).version).toBe(APP_VERSION);
  });
});
