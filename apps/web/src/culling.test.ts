import { describe, expect, it } from 'vitest';
import { isInView, nextInDirection, segmentsPath } from './culling.js';
import { IDENTITY } from './viewport.js';

const box = { width: 800, height: 520 };

describe('culling', () => {
  it('keeps points on screen, with a margin, and drops far ones', () => {
    expect(isInView({ x: 10, y: 10 }, IDENTITY, box)).toBe(true);
    expect(isInView({ x: -30, y: 10 }, IDENTITY, box)).toBe(true);
    expect(isInView({ x: 2000, y: 10 }, IDENTITY, box)).toBe(false);
    expect(isInView({ x: 10, y: -500 }, IDENTITY, box)).toBe(false);
  });

  it('follows zoom and pan', () => {
    const zoomed = { x: -1000, y: 0, scale: 2 };
    expect(isInView({ x: 600, y: 100 }, zoomed, box)).toBe(true);
    expect(isInView({ x: 10, y: 100 }, zoomed, box)).toBe(false);
  });

  it('writes one subpath per segment', () => {
    expect(
      segmentsPath([
        [
          { x: 1, y: 2 },
          { x: 3, y: 4 },
        ],
        [
          { x: 5, y: 6 },
          { x: 7, y: 8 },
        ],
      ]),
    ).toBe('M1 2L3 4M5 6L7 8');
    expect(segmentsPath([])).toBe('');
  });

  it('finds the closest vertex in an arrow direction', () => {
    const from = { x: 0, y: 0 };
    const others = [
      ['near', { x: 10, y: 0 }],
      ['aside', { x: 10, y: 40 }],
      ['far', { x: 90, y: 0 }],
      ['behind', { x: -10, y: 0 }],
    ] as const;
    expect(nextInDirection(from, { dx: 1, dy: 0 }, others)).toBe('near');
    expect(nextInDirection(from, { dx: -1, dy: 0 }, others)).toBe('behind');
    expect(nextInDirection(from, { dx: 0, dy: 1 }, others)).toBe('aside');
    expect(nextInDirection(from, { dx: 0, dy: -1 }, others)).toBeUndefined();
  });
});
