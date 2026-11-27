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

describe('pinned coordinates', () => {
  it('prints them', () => {
    expect(
      JSON.stringify(
        Object.fromEntries(Object.entries(cases).map(([key, layout]) => [key, round(layout)])),
      ),
    ).toBe('PIN');
  });
});
