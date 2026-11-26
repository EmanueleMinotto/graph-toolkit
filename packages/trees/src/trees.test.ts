import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { describe, expect, it } from 'vitest';
import { isForest, isTree, minimumSpanningForest } from './index.js';

const name = (index: number) => vertexId(String(index));

const build = (count: number, arcs: readonly (readonly [number, number, number])[]): Graph => {
  const builder = new GraphBuilder();

  for (let index = 0; index < count; index++) {
    builder.addVertex(name(index));
  }

  for (const [from, to, weight] of arcs) {
    builder.addEdge(name(from), name(to), weight);
  }

  return builder.build();
};

describe('minimumSpanningForest', () => {
  it('picks the cheapest edges', () => {
    const graph = build(4, [
      [0, 1, 1],
      [1, 2, 2],
      [0, 2, 3],
      [2, 3, 4],
      [1, 3, 10],
    ]);
    const forest = minimumSpanningForest(graph);

    expect(forest.totalWeight).toBe(7);
    expect(forest.edges).toHaveLength(3);
  });

  it('spans each component of a disconnected graph', () => {
    const forest = minimumSpanningForest(
      build(4, [
        [0, 1, 5],
        [2, 3, 6],
      ]),
    );

    expect(forest.totalWeight).toBe(11);
  });

  it('rejects directed graphs', () => {
    expect(() => minimumSpanningForest(new GraphBuilder({ directed: true }).build())).toThrow();
  });
});

describe('isForest / isTree', () => {
  it('classifies graphs', () => {
    const path = build(3, [
      [0, 1, 1],
      [1, 2, 1],
    ]);
    const triangle = build(3, [
      [0, 1, 1],
      [1, 2, 1],
      [2, 0, 1],
    ]);
    const split = build(4, [
      [0, 1, 1],
      [2, 3, 1],
    ]);

    expect([isTree(path), isForest(path)]).toEqual([true, true]);
    expect([isTree(triangle), isForest(triangle)]).toEqual([false, false]);
    expect([isTree(split), isForest(split)]).toEqual([false, true]);
    expect(isTree(build(0, []))).toBe(false);
  });
});
