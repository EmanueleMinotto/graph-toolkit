import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-sdk/core';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bellmanFord, dijkstra, floydWarshall, hasCycle, NegativeCycleError } from './index.js';

type Arc = readonly [number, number, number];

const name = (index: number) => vertexId(String(index));

const build = (count: number, arcs: readonly Arc[], directed = true): Graph => {
  const builder = new GraphBuilder({ directed });
  for (let index = 0; index < count; index++) {
    builder.addVertex(name(index));
  }
  for (const [from, to, weight] of arcs) {
    builder.addEdge(name(from), name(to), weight);
  }
  return builder.build();
};

const diamond = build(5, [
  [0, 1, 1],
  [0, 2, 4],
  [1, 2, 2],
  [2, 3, 1],
]);

describe('shortest paths', () => {
  it('dijkstra finds distances and paths', () => {
    const tree = dijkstra(diamond, name(0));
    expect(tree.distanceTo(name(3))).toBe(4);
    expect(tree.pathTo(name(3))).toEqual([name(0), name(1), name(2), name(3)]);
    expect(tree.pathTo(name(0))).toEqual([name(0)]);
    expect(tree.distanceTo(name(4))).toBe(Infinity);
    expect(tree.pathTo(name(4))).toBeUndefined();
  });

  it('dijkstra rejects negative weights', () => {
    expect(() => dijkstra(build(2, [[0, 1, -1]]), name(0))).toThrow(GraphError);
  });

  it('bellman-ford handles negative weights and detects negative cycles', () => {
    const negative = build(3, [
      [0, 1, 4],
      [1, 2, -2],
      [0, 2, 3],
    ]);
    expect(bellmanFord(negative, name(0)).distanceTo(name(2))).toBe(2);
    const cycle = build(3, [
      [0, 1, 1],
      [1, 2, -3],
      [2, 1, 1],
    ]);
    expect(() => bellmanFord(cycle, name(0))).toThrow(NegativeCycleError);
  });

  it('bellman-ford converges on the last round for reversed chains', () => {
    const chain = build(4, [
      [3, 2, 1],
      [2, 1, 1],
      [1, 0, 1],
    ]);
    expect(bellmanFord(chain, name(3)).distanceTo(name(0))).toBe(3);
  });

  it('floyd-warshall computes all pairs and detects negative cycles', () => {
    const matrix = floydWarshall(diamond);
    expect(matrix.distance(name(0), name(3))).toBe(4);
    expect(matrix.distance(name(3), name(0))).toBe(Infinity);
    expect(() => floydWarshall(build(2, [[0, 1, -1]], false))).toThrow(NegativeCycleError);
  });

  it('agrees across all three algorithms on random non-negative graphs', () => {
    const arcs = fc.uniqueArray(fc.tuple(fc.nat(5), fc.nat(5), fc.integer({ min: 0, max: 9 })), {
      selector: ([from, to]) => `${from}:${to}`,
    });
    fc.assert(
      fc.property(arcs, (list) => {
        const graph = build(6, list);
        const all = floydWarshall(graph);
        for (let from = 0; from < 6; from++) {
          const dijkstraTree = dijkstra(graph, name(from));
          const bellmanTree = bellmanFord(graph, name(from));
          for (let to = 0; to < 6; to++) {
            expect(dijkstraTree.distanceTo(name(to))).toBe(all.distance(name(from), name(to)));
            expect(bellmanTree.distanceTo(name(to))).toBe(all.distance(name(from), name(to)));
          }
        }
      }),
    );
  });
});

describe('hasCycle', () => {
  it('handles directed graphs', () => {
    expect(hasCycle(diamond)).toBe(false);
    expect(hasCycle(build(2, [[0, 0, 1]]))).toBe(true);
    expect(
      hasCycle(
        build(2, [
          [0, 1, 1],
          [1, 0, 1],
        ]),
      ),
    ).toBe(true);
  });

  it('handles undirected graphs', () => {
    expect(
      hasCycle(
        build(
          3,
          [
            [0, 1, 1],
            [1, 2, 1],
          ],
          false,
        ),
      ),
    ).toBe(false);
    expect(
      hasCycle(
        build(
          3,
          [
            [0, 1, 1],
            [1, 2, 1],
            [2, 0, 1],
          ],
          false,
        ),
      ),
    ).toBe(true);
    expect(hasCycle(build(1, [[0, 0, 1]], false))).toBe(true);
  });
});
