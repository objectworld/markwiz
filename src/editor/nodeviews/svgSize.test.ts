import { describe, expect, it } from 'vitest';
import { svgNaturalSize } from './svgSize';

describe('svgNaturalSize', () => {
  it('prefers the viewBox', () => {
    expect(svgNaturalSize('<svg xmlns="x" viewBox="0 0 320.5 180" width="100%"><g/></svg>')).toEqual({ width: 320.5, height: 180 });
  });

  it('falls back to numeric width/height', () => {
    expect(svgNaturalSize('<svg width="200px" height="100"></svg>')).toEqual({ width: 200, height: 100 });
  });

  it('returns null when only percentages or nothing is given', () => {
    expect(svgNaturalSize('<svg width="100%" height="100%"></svg>')).toBeNull();
    expect(svgNaturalSize('<svg></svg>')).toBeNull();
    expect(svgNaturalSize('not svg')).toBeNull();
  });
});
