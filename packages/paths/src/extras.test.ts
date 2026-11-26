import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-sdk/core';
import { pathGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import { aStar, dijkstra, kShortestPaths } from './index.js';

const name = (index: number) => vertexId(String(index));

const build = (
  count: number,
  arcs: readonly (readonly [number, number, number])[],
  directed = false,
): Graph => {
  const builder = new GraphBuilder({ directed });
  for (let index = 0; index < count; index++) {
    builder.addVertex(name(index));
  }
  for (const [from, to, weight] of arcs) {
    builder.addEdge(name(from), name(to), weight);
  }
  return builder.build();
};

describe('aStar', () => {
  const grid = build(4, [
    [0, 1, 1],
    [1, 3, 1],
    [0, 2, 5],
    [2, 3, 1],
  ]);

  it('matches dijkstra with a zero or exact heuristic', () => {
    const exact = dijkstra(grid, name(0));
    const zero = aStar(grid, { source: name(0), target: name(3), heuristic: () => 0 })!;
    expect(zero.distance).toBe(exact.distanceTo(name(3)));
    expect(zero.path).toEqual(exact.pathTo(name(3)));
    const guided = aStar(grid, {
      source: name(0),
      target: name(3),
      heuristic: (vertex) => (vertex === name(3) ? 0 : 1),
    })!;
    expect(guided.distance).toBe(2);
  });

  it('skips stale queue entries after an improvement', () => {
    const detour = build(4, [
      [0, 1, 5],
      [0, 2, 1],
      [2, 1, 1],
      [1, 3, 10],
    ]);
    const result = aStar(detour, { source: name(0), target: name(3), heuristic: () => 0 });
    expect(result?.distance).toBe(12);
  });

  it('reports unreachable targets and negative weights', () => {
    expect(
      aStar(build(2, []), { source: name(0), target: name(1), heuristic: () => 0 }),
    ).toBeUndefined();
    expect(() =>
      aStar(build(2, [[0, 1, -1]]), { source: name(0), target: name(1), heuristic: () => 0 }),
    ).toThrow(GraphError);
  });
});

describe('kShortestPaths', () => {
  const graph = build(
    5,
    [
      [0, 1, 1],
      [1, 4, 1],
      [0, 2, 1],
      [2, 4, 2],
      [0, 3, 2],
      [3, 4, 2],
      [1, 2, 1],
    ],
    true,
  );

  it('lists paths by increasing cost', () => {
    const paths = kShortestPaths(graph, { source: name(0), target: name(4), count: 4 });
    expect(paths.map((path) => path.distance)).toEqual([2, 3, 4, 4]);
    expect(new Set(paths.map((path) => path.path.join(','))).size).toBe(paths.length);
  });

  it('stops when no more paths exist and handles edge cases', () => {
    expect(
      kShortestPaths(pathGraph(3), { source: name(0), target: name(2), count: 5 }),
    ).toHaveLength(1);
    expect(kShortestPaths(build(2, []), { source: name(0), target: name(1), count: 3 })).toEqual(
      [],
    );
    expect(kShortestPaths(pathGraph(3), { source: name(0), target: name(2), count: 0 })).toEqual(
      [],
    );
    expect(() =>
      kShortestPaths(build(2, [[0, 1, -1]]), { source: name(0), target: name(1), count: 1 }),
    ).toThrow(GraphError);
  });
});
