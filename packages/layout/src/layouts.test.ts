import { completeGraph, cycleGraph, pathGraph } from '@graph-toolkit/generators';
import { describe, expect, it } from 'vitest';
import { circularLayout, forceLayout, gridLayout } from './index.js';

describe('layouts', () => {
  it('places vertices on a circle', () => {
    const layout = circularLayout(cycleGraph(4), 2);
    for (const point of layout.values()) {
      expect(Math.hypot(point.x, point.y)).toBeCloseTo(2, 9);
    }
    expect(circularLayout(cycleGraph(4)).size).toBe(4);
  });

  it('places vertices on a grid', () => {
    const layout = gridLayout(pathGraph(5), 10);
    expect(layout.size).toBe(5);
    expect(layout.get(pathGraph(5).vertices()[4]!)).toEqual({ x: 10, y: 10 });
    expect(gridLayout(pathGraph(0)).size).toBe(0);
  });

  it('computes deterministic, bounded force layouts', () => {
    const graph = completeGraph(6);
    const first = forceLayout(graph, { seed: 7 });
    expect(forceLayout(graph, { seed: 7 })).toEqual(first);
    expect(forceLayout(graph, { seed: 8 })).not.toEqual(first);
    for (const point of first.values()) {
      expect(point.x).toBeGreaterThanOrEqual(0);
      expect(point.x).toBeLessThanOrEqual(1);
      expect(Number.isFinite(point.y)).toBe(true);
    }
  });

  it('spreads out coincident-free starts and handles empty graphs', () => {
    expect(forceLayout(pathGraph(0)).size).toBe(0);
    const layout = forceLayout(pathGraph(2), { iterations: 50 });
    const [left, right] = [...layout.values()] as [
      { x: number; y: number },
      { x: number; y: number },
    ];
    expect(Math.hypot(left.x - right.x, left.y - right.y)).toBeGreaterThan(0);
  });
});
