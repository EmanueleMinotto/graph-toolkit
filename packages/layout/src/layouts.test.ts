import { completeGraph, cycleGraph, pathGraph } from '@graph-toolkit/generators';
import { describe, expect, it } from 'vitest';
import { GraphBuilder, vertexId } from '@graph-toolkit/core';
import { circularLayout, forceLayout, gridLayout, layeredLayout } from './index.js';

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

const name = (index: number) => vertexId(String(index));

describe('layeredLayout', () => {
  it('puts DAG levels on increasing y and centers each layer', () => {
    const builder = new GraphBuilder({ directed: true });
    for (let index = 0; index < 4; index++) builder.addVertex(name(index));
    for (const [from, to] of [
      [0, 1],
      [0, 2],
      [1, 3],
      [2, 3],
    ] as const)
      builder.addEdge(name(from), name(to));
    const layout = layeredLayout(builder.build(), { layerGap: 10, nodeGap: 4 });
    expect(layout.get(name(0))).toEqual({ x: 0, y: 0 });
    expect(layout.get(name(3))).toEqual({ x: 0, y: 20 });
    expect(layout.get(name(1))!.x).toBe(-layout.get(name(2))!.x);
  });

  it('uses BFS depth for cyclic and undirected graphs and orders by barycenter', () => {
    const cycle = layeredLayout(cycleGraph(4));
    expect(cycle.get(vertexId('0'))!.y).toBe(0);
    expect(cycle.get(vertexId('2'))!.y).toBe(2);
    const crossing = new GraphBuilder({ directed: true });
    for (let index = 0; index < 5; index++) crossing.addVertex(name(index));
    for (const [from, to] of [
      [0, 3],
      [1, 2],
      [2, 4],
      [3, 4],
    ] as const)
      crossing.addEdge(name(from), name(to));
    expect(layeredLayout(crossing.build()).size).toBe(5);
  });

  it('handles empty graphs', () => {
    expect(layeredLayout(pathGraph(0)).size).toBe(0);
  });
});
