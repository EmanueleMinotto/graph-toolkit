import { describe, expect, it } from 'vitest';
import { IDENTITY, panBy, shifted, toContent, toScreen, wheelFactor, zoomAt } from './viewport.js';

describe('viewport', () => {
  it('round trips between content and screen', () => {
    const view = { x: 30, y: -10, scale: 2.5 };
    const back = toContent(view, toScreen(view, { x: 7, y: 9 }));
    expect(back.x).toBeCloseTo(7, 9);
    expect(back.y).toBeCloseTo(9, 9);
  });

  it('keeps the anchor fixed while zooming', () => {
    const anchor = { x: 200, y: 100 };
    const zoomed = zoomAt({ x: 10, y: 20, scale: 1 }, 2, anchor);
    expect(zoomed.scale).toBe(2);
    const [after, before] = [
      toContent(zoomed, anchor),
      toContent({ x: 10, y: 20, scale: 1 }, anchor),
    ];
    expect(after.x).toBeCloseTo(before.x, 9);
    expect(after.y).toBeCloseTo(before.y, 9);
  });

  it('clamps the scale', () => {
    expect(zoomAt(IDENTITY, 1000, { x: 0, y: 0 }).scale).toBeCloseTo(8, 9);
    expect(zoomAt(IDENTITY, 0.0001, { x: 0, y: 0 }).scale).toBeCloseTo(0.2, 9);
  });

  it('pans and maps wheel deltas', () => {
    expect(panBy(IDENTITY, 5, -3)).toEqual({ x: 5, y: -3, scale: 1 });
    expect(wheelFactor(-100)).toBeGreaterThan(1);
    expect(wheelFactor(100)).toBeLessThan(1);
    expect(wheelFactor(0)).toBe(1);
  });
});

describe('shifted', () => {
  it('moves only the listed entries and keeps the others', () => {
    const moved = new Map([['keep', { x: 1, y: 1 }]]);
    const result = shifted(moved, [['a', { x: 10, y: 20 }]], [2, -3]);
    expect(result.get('a')).toEqual({ x: 12, y: 17 });
    expect(result.get('keep')).toEqual({ x: 1, y: 1 });
    expect(moved.size).toBe(1);
  });
});
