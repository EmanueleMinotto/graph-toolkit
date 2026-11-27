import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { cycleGraph, pathGraph, starGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  aStar,
  bellmanFord,
  dagShortestPaths,
  dijkstra,
  eulerianTrail,
  floydWarshall,
  hamiltonianCycle,
  johnson,
  kShortestPaths,
} from './index.js';

type Arc = readonly [number, number, number];

const name = (index: number) => vertexId(String(index));

const build = (count: number, arcs: readonly Arc[]): Graph => {
  const builder = new GraphBuilder({ directed: true });

  for (let index = 0; index < count; index++) {
    builder.addVertex(name(index));
  }

  for (const [from, to, weight] of arcs) {
    builder.addEdge(name(from), name(to), weight);
  }

  return builder.build();
};

// Vertex 0 is outside the negative cycle 1 → 2 → 1 (weight −2).
const hidden = build(3, [
  [0, 1, 1],
  [1, 2, -3],
  [2, 1, 1],
]);

const negative = build(2, [[0, 1, -1]]);

describe('error messages', () => {
  it('words every refusal', () => {
    expect(() => dijkstra(negative, name(0))).toThrow('dijkstra requires non-negative weights');

    expect(() => aStar(negative, { source: name(0), target: name(1), heuristic: () => 0 })).toThrow(
      'aStar requires non-negative weights',
    );

    expect(() => kShortestPaths(negative, { source: name(0), target: name(1), count: 1 })).toThrow(
      'kShortestPaths requires non-negative weights',
    );

    expect(() => bellmanFord(hidden, name(0))).toThrow('Negative cycle reachable from source');
    expect(() => floydWarshall(hidden)).toThrow('Graph contains a negative cycle');
    expect(() => johnson(hidden)).toThrow('Graph contains a negative cycle');

    expect(() => dagShortestPaths(pathGraph(3), name(0))).toThrow(
      'dagShortestPaths requires a directed acyclic graph',
    );
  });

  it('accepts zero-weight edges', () => {
    const zero = build(2, [[0, 1, 0]]);

    expect(dijkstra(zero, name(0)).distanceTo(name(1))).toBe(0);
    expect(aStar(zero, { source: name(0), target: name(1), heuristic: () => 0 })?.distance).toBe(0);
    expect(kShortestPaths(zero, { source: name(0), target: name(1), count: 1 })).toHaveLength(1);
  });
});

describe('searches', () => {
  const grid = build(4, [
    [0, 1, 1],
    [0, 2, 4],
    [1, 2, 2],
    [1, 3, 5],
    [2, 3, 1],
  ]);

  it('lists the k shortest loopless paths, cheapest first and without repeats', () => {
    const found = kShortestPaths(grid, { source: name(0), target: name(3), count: 5 });

    expect(found.map((entry) => entry.distance)).toEqual([4, 5, 6]);

    expect(found.map((entry) => entry.path.join('>'))).toEqual(['0>1>2>3', '0>2>3', '0>1>3']);
    expect(kShortestPaths(grid, { source: name(0), target: name(3), count: 2 })).toHaveLength(2);
  });

  it('finds the cheapest route with A* and reports unreachable targets', () => {
    const request = { source: name(0), target: name(3), heuristic: () => 0 };

    expect(aStar(grid, request)).toEqual({
      distance: 4,
      path: [name(0), name(1), name(2), name(3)],
    });

    expect(aStar(grid, { ...request, source: name(3), target: name(0) })).toBeUndefined();
  });

  it('flags a negative cycle that does not touch every vertex', () => {
    expect(() => floydWarshall(hidden)).toThrow();
    expect(() => johnson(hidden)).toThrow();
  });

  it('handles unreachable vertices in Bellman-Ford and Johnson', () => {
    const island = build(3, [[0, 1, 2]]);

    expect(bellmanFord(island, name(0)).distanceTo(name(2))).toBe(Infinity);
    expect(johnson(island).distance(name(0), name(2))).toBe(Infinity);
    expect(johnson(island).distance(name(0), name(1))).toBe(2);
  });
});

describe('trails', () => {
  it('finds Euler trails in undirected and directed graphs', () => {
    expect(eulerianTrail(pathGraph(3))?.join('')).toMatch(/^(012|210)$/);
    expect(eulerianTrail(pathGraph(3, { directed: true }))).toEqual(['0', '1', '2']);
    expect(eulerianTrail(starGraph(4))).toBeUndefined();

    const fork = build(4, [
      [0, 1, 1],
      [0, 2, 1],
      [0, 3, 1],
    ]);

    expect(eulerianTrail(fork)).toBeUndefined();
  });

  it('closes a Hamiltonian cycle on a triangle', () => {
    expect(hamiltonianCycle(cycleGraph(3))).toHaveLength(3);
    expect(hamiltonianCycle(cycleGraph(2))).toBeUndefined();
  });
});
