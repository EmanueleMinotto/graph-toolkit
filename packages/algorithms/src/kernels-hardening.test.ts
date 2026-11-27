import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import {
  completeBipartiteGraph,
  completeGraph,
  cycleGraph,
  hypercubeGraph,
  pathGraph,
  petersenGraph,
  starGraph,
  wheelGraph,
} from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  isPlanar,
  leiden,
  louvain,
  maximumBipartiteMatching,
  maximumMatching,
  minimumCostAssignment,
  pageRank,
} from './index.js';

const build = (count: number, pairs: readonly (readonly [number, number])[]): Graph => {
  const builder = new GraphBuilder();

  for (let index = 0; index < count; index++) {
    builder.addVertex(vertexId(String(index)));
  }

  for (const [from, to] of pairs) {
    builder.addEdge(vertexId(String(from)), vertexId(String(to)));
  }

  return builder.build();
};

describe('minimumCostAssignment', () => {
  it('finds the optimum of square, negative and rectangular matrices', () => {
    expect(
      minimumCostAssignment([
        [4, 1, 3],
        [2, 0, 5],
        [3, 2, 2],
      ]),
    ).toEqual({ assignment: [1, 0, 2], cost: 5 });

    expect(
      minimumCostAssignment([
        [-1, -2],
        [-3, 0],
      ]),
    ).toEqual({ assignment: [1, 0], cost: -5 });

    expect(
      minimumCostAssignment([
        [1, 2, 3],
        [3, 2, 1],
      ]),
    ).toEqual({ assignment: [0, 2], cost: 2 });

    expect(
      minimumCostAssignment([
        [9, 2, 7, 8],
        [6, 4, 3, 7],
        [5, 8, 1, 8],
        [7, 6, 9, 4],
      ]).cost,
    ).toBe(13);
  });

  it('handles an empty matrix', () => {
    expect(minimumCostAssignment([])).toEqual({ assignment: [], cost: 0 });
  });
});

describe('matching', () => {
  it('finds perfect matchings that need blossom contraction', () => {
    const triangleWithPendants = build(6, [
      [0, 1],
      [1, 2],
      [2, 0],
      [0, 3],
      [1, 4],
      [2, 5],
    ]);

    const pentagonWithPendant = build(6, [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 0],
      [0, 5],
    ]);

    expect(maximumMatching(triangleWithPendants).size).toBe(3);
    expect(maximumMatching(pentagonWithPendant).size).toBe(3);
    expect(maximumMatching(completeGraph(5)).size).toBe(2);
    expect(maximumMatching(completeGraph(4)).size).toBe(2);
    expect(maximumMatching(cycleGraph(7)).size).toBe(3);
    expect(maximumMatching(petersenGraph()).size).toBe(5);
    expect(maximumMatching(pathGraph(0)).size).toBe(0);
  });

  it('reports each matched pair once, between matched vertices only', () => {
    const { pairs } = maximumMatching(pathGraph(4));
    const flat = pairs.flat();

    expect(new Set(flat).size).toBe(flat.length);
    expect(pairs).toHaveLength(2);
  });

  it('matches bipartite graphs maximally', () => {
    expect(maximumBipartiteMatching(completeBipartiteGraph(3, 3)).size).toBe(3);
    expect(maximumBipartiteMatching(completeBipartiteGraph(2, 5)).size).toBe(2);
    expect(maximumBipartiteMatching(pathGraph(4)).size).toBe(2);
    expect(maximumBipartiteMatching(pathGraph(5)).size).toBe(2);
    expect(maximumBipartiteMatching(starGraph(6)).size).toBe(1);
    expect(maximumBipartiteMatching(pathGraph(0)).size).toBe(0);
  });
});

describe('isPlanar', () => {
  it('separates planar from non-planar graphs', () => {
    expect(isPlanar(completeGraph(4))).toBe(true);
    expect(isPlanar(completeGraph(5))).toBe(false);
    expect(isPlanar(completeBipartiteGraph(3, 3))).toBe(false);
    expect(isPlanar(petersenGraph())).toBe(false);
    expect(isPlanar(hypercubeGraph(3))).toBe(true);
    expect(isPlanar(wheelGraph(7))).toBe(true);

    const almostK5 = build(5, [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 2],
      [1, 3],
      [1, 4],
      [2, 3],
      [2, 4],
    ]);

    expect(isPlanar(almostK5)).toBe(true);
  });
});

describe('communities', () => {
  const barbell = build(8, [
    [0, 1],
    [0, 2],
    [0, 3],
    [1, 2],
    [1, 3],
    [2, 3],
    [4, 5],
    [4, 6],
    [4, 7],
    [5, 6],
    [5, 7],
    [6, 7],
    [3, 4],
  ]);

  it('finds the two cliques of a barbell, numbered by first appearance', () => {
    for (const detect of [louvain, leiden]) {
      expect([...detect(barbell).values()]).toEqual([0, 0, 0, 0, 1, 1, 1, 1]);
    }
  });

  it('keeps disconnected cliques apart', () => {
    const apart = build(6, [
      [0, 1],
      [1, 2],
      [0, 2],
      [3, 4],
      [4, 5],
      [3, 5],
    ]);

    for (const detect of [louvain, leiden]) {
      expect([...detect(apart).values()]).toEqual([0, 0, 0, 1, 1, 1]);
    }
  });
});

describe('pageRank', () => {
  it('sums to one and ranks a hub first', () => {
    const ranks = pageRank(starGraph(6));
    const total = ranks.values().reduce((sum, value) => sum + value, 0);

    expect(total).toBeCloseTo(1);
    expect(ranks.get(vertexId('0'))!).toBeGreaterThan(ranks.get(vertexId('1'))!);
  });

  it('stops early only once the scores settle', () => {
    const graph = pathGraph(6);
    const settled = pageRank(graph, { maxIterations: 1000, tolerance: 0 });
    const byDefault = pageRank(graph);
    const oneRound = pageRank(graph, { maxIterations: 1 });

    for (const [vertex, value] of settled) {
      expect(byDefault.get(vertex)!).toBeCloseTo(value, 6);
    }

    expect(oneRound.get(vertexId('0'))!).not.toBeCloseTo(settled.get(vertexId('0'))!, 4);
  });
});
