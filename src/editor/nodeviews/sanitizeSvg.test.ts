import { describe, expect, it } from 'vitest';
import { sanitizeSvg } from './sanitizeSvg';

describe('sanitizeSvg', () => {
  it('keeps ordinary SVG content', () => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg"><rect x="1" y="2" width="3" height="4"/><text>Alice</text></svg>';
    const result = sanitizeSvg(svg);
    expect(result).toContain('<rect');
    expect(result).toContain('Alice');
  });

  it('strips scripts, event handlers and javascript: links', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)">' +
      '<script>alert(2)</script>' +
      '<a xlink:href="javascript:alert(3)" href="javascript:alert(4)"><text>click</text></a>' +
      '</svg>';
    const result = sanitizeSvg(svg);
    expect(result).not.toMatch(/<script/i);
    expect(result).not.toMatch(/onload/i);
    expect(result).not.toMatch(/javascript:/i);
    expect(result).toContain('click');
  });
});
