import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { completeGraph, cycleGraph, pathGraph, starGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import { forceLayout, layeredLayout, spectralLayout, tutteLayout, type Layout } from './index.js';

const build = (names: readonly string[], arcs: readonly (readonly [string, string])[]): Graph => {
  const builder = new GraphBuilder();

  for (const name of names) {
    builder.addVertex(vertexId(name));
  }

  for (const [from, to] of arcs) {
    builder.addEdge(vertexId(from), vertexId(to));
  }

  return builder.build();
};

const round = (layout: Layout): number[][] =>
  [...layout.values()].map(({ x, y }) => [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]);

const cases: Record<string, Layout> = {
  forcePath: forceLayout(pathGraph(5), { seed: 1, iterations: 40 }),
  forceStar: forceLayout(starGraph(5), { seed: 2, iterations: 25 }),
  forceCycle: forceLayout(cycleGraph(6), { seed: 3, iterations: 60 }),
  forceClique: forceLayout(completeGraph(4), { seed: 4, iterations: 10 }),
  tutteLoops: tutteLayout(
    build(
      ['a', 'b', 'c', 'd', 'e', 'x', 'y'],
      [
        ['a', 'b'],
        ['b', 'c'],
        ['c', 'd'],
        ['d', 'a'],
        ['e', 'a'],
        ['e', 'c'],
        ['x', 'y'],
        ['a', 'a'],
      ],
    ),
  ),
  spectralPath: spectralLayout(pathGraph(4)),
  layeredFan: layeredLayout(
    build(
      ['a', 'b', 'c', 'd', 'e'],
      [
        ['a', 'c'],
        ['b', 'd'],
        ['b', 'c'],
        ['c', 'e'],
        ['d', 'e'],
      ],
    ),
  ),
};

const pinned: Record<string, readonly (readonly [number, number])[]> = {
  forceClique: [
    [0.67426, 0.30321],
    [0.25907, 0.22524],
    [0.58286, 0.71167],
    [0.1715, 0.63858],
  ],
  forceCycle: [
    [0.70368, 0],
    [1, 0.45163],
    [0.82899, 0.96697],
    [0.29255, 1],
    [0, 0.54939],
    [0.16732, 0.03375],
  ],
  forcePath: [
    [1, 0],
    [1, 0.41862],
    [0.5015, 0.50624],
    [0, 0.58339],
    [0, 1],
  ],
  forceStar: [
    [0.58975, 0.50199],
    [0.167, 0.92668],
    [1, 0.94832],
    [0.16842, 0.07364],
    [1, 0.06073],
  ],
  layeredFan: [
    [0, 0],
    [-0.5, 2],
    [0, 1],
    [0, 3],
    [0.5, 2],
  ],
  spectralPath: [
    [-0.65328, -0.5],
    [-0.2706, 0.5],
    [0.2706, 0.5],
    [0.65328, -0.5],
  ],
  tutteLoops: [
    [0, -1],
    [1, 0],
    [0, 1],
    [-1, 0],
    [0, 0],
    [1.5, 0],
    [-1.5, 0],
  ],
};

describe('pinned coordinates', () => {
  it.each(Object.keys(pinned))('keeps %s exactly where it was', (key) => {
    const actual = round(cases[key]!);

    expect(actual).toHaveLength(pinned[key]!.length);

    const expected = pinned[key]!.entries();

    for (const [index, [x, y]] of expected) {
      expect(actual[index]![0]).toBeCloseTo(x, 4);
      expect(actual[index]![1]).toBeCloseTo(y, 4);
    }
  });
});
