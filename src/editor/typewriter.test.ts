import { describe, expect, it } from 'vitest';
import { typewriterScrollDelta } from './typewriter';

describe('typewriterScrollDelta', () => {
  it('is zero when the caret line is already centered', () => {
    expect(typewriterScrollDelta(290, 310, 0, 600)).toBe(0);
  });

  it('scrolls down when the caret is below center and up when above', () => {
    expect(typewriterScrollDelta(490, 510, 0, 600)).toBe(200);
    expect(typewriterScrollDelta(90, 110, 0, 600)).toBe(-200);
  });

  it('accounts for the container offset', () => {
    expect(typewriterScrollDelta(390, 410, 100, 600)).toBe(0);
  });
});
