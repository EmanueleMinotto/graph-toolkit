import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-sdk/core';
import { cycleGraph } from '@graph-sdk/generators';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { globalMinCut } from './index.js';

const name = (index: number) => vertexId(String(index));

const build = (count: number, edges: readonly (readonly [number, number, number])[]): Graph => {
  const builder = new GraphBuilder({ allowParallelEdges: true });

  for (let index = 0; index < count; index++) {
    builder.addVertex(name(index));
  }

  for (const [from, to, weight] of edges) {
    builder.addEdge(name(from), name(to), weight);
  }

  return builder.build();
};

/** Cheapest of all 2^(n-1) bipartitions that fix vertex 0 on one side. */
const bruteForce = (count: number, edges: readonly (readonly [number, number, number])[]) => {
  const cuts = Array.from({ length: 2 ** (count - 1) - 1 }, (_, mask) => (mask + 1) * 2);

  return Math.min(
    ...cuts.map((mask) =>
      edges
        .filter(([from, to]) => Boolean((mask >> from) & 1) !== Boolean((mask >> to) & 1))
        .reduce((sum, edge) => sum + edge[2], 0),
    ),
  );
};

describe('globalMinCut', () => {
  it('solves the Stoer–Wagner paper example', () => {
    const graph = build(8, [
      [0, 1, 2],
      [0, 4, 3],
      [1, 2, 3],
      [1, 4, 2],
      [1, 5, 2],
      [2, 3, 4],
      [2, 6, 2],
      [3, 6, 2],
      [3, 7, 2],
      [4, 5, 3],
      [5, 6, 1],
      [6, 7, 3],
    ]);
    const cut = globalMinCut(graph);

    expect(cut.value).toBe(4);
    expect(cut.edges.reduce((sum, edge) => sum + edge.weight, 0)).toBe(4);
    expect(new Set([...cut.side, ...cut.otherSide])).toEqual(new Set(graph.vertices()));
    expect(cut.side.length + cut.otherSide.length).toBe(graph.vertexCount);
  });

  it('cuts a cycle at two edges and reports zero for disconnected graphs', () => {
    expect(globalMinCut(cycleGraph(5)).value).toBe(2);
    expect(globalMinCut(build(3, [[0, 1, 4]])).value).toBe(0);
  });

  it('adds parallel edges and ignores self-loops', () => {
    expect(
      globalMinCut(
        build(2, [
          [0, 1, 2],
          [0, 1, 3],
          [0, 0, 9],
        ]),
      ).value,
    ).toBe(5);
  });

  it('matches exhaustive search on random graphs', () => {
    const edge = fc.tuple(fc.nat(4), fc.nat(4), fc.integer({ min: 0, max: 9 }));

    fc.assert(
      fc.property(fc.array(edge), (list) => {
        const edges = list.filter(([from, to]) => from !== to);

        expect(globalMinCut(build(5, edges)).value).toBe(bruteForce(5, edges));
      }),
    );
  });

  it('validates input', () => {
    expect(() => globalMinCut(new GraphBuilder({ directed: true }).build())).toThrow(GraphError);
    expect(() => globalMinCut(build(1, []))).toThrow(GraphError);
    expect(() => globalMinCut(build(2, [[0, 1, -1]]))).toThrow(GraphError);
  });
});
