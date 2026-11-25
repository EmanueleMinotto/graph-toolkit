import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-sdk/core';
import {
  completeGraph,
  cycleGraph,
  pathGraph,
  randomGraph,
  starGraph,
} from '@graph-sdk/generators';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  betweennessCentrality,
  closenessCentrality,
  communities,
  degreeCentrality,
  maximalCliques,
  maximumClique,
} from './index.js';

const name = (index: number) => vertexId(String(index));

const network = (count: number, arcs: readonly (readonly [number, number, number])[]): Graph => {
  const builder = new GraphBuilder({ directed: true });
  for (let index = 0; index < count; index++) builder.addVertex(name(index));
  for (const [from, to, capacity] of arcs) builder.addEdge(name(from), name(to), capacity);
  return builder.build();
};

describe('centrality', () => {
  it('scores a star', () => {
    const star = starGraph(5);
    expect(degreeCentrality(star).get(name(0))).toBe(1);
    expect(degreeCentrality(pathGraph(1)).get(name(0))).toBe(0);
    expect(closenessCentrality(star).get(name(0))).toBe(1);
    expect(closenessCentrality(star).get(name(1))).toBeCloseTo(4 / 7, 9);
    expect(betweennessCentrality(star).get(name(0))).toBe(6);
    expect(betweennessCentrality(star).get(name(1))).toBe(0);
  });

  it('handles isolated vertices, paths and directed graphs', () => {
    expect(closenessCentrality(pathGraph(1)).get(name(0))).toBe(0);
    expect(betweennessCentrality(pathGraph(3)).get(name(1))).toBe(1);
    const directed = network(3, [
      [0, 1, 1],
      [1, 2, 1],
    ]);
    expect(betweennessCentrality(directed).get(name(1))).toBe(1);
  });
});

describe('communities', () => {
  it('separates two cliques joined by a bridge', () => {
    const builder = new GraphBuilder();
    for (let index = 0; index < 8; index++) builder.addVertex(name(index));
    for (const [first, second] of [
      [0, 1],
      [0, 2],
      [1, 2],
      [0, 3],
      [1, 3],
      [2, 3],
      [4, 5],
      [4, 6],
      [5, 6],
      [4, 7],
      [5, 7],
      [6, 7],
      [3, 4],
    ]) {
      builder.addEdge(name(first!), name(second!));
    }
    const groups = communities(builder.build());
    expect(groups.get(name(0))).toBe(groups.get(name(3)));
    expect(groups.get(name(4))).toBe(groups.get(name(7)));
    expect(groups.get(name(0))).not.toBe(groups.get(name(4)));
  });

  it('ignores self loops', () => {
    const looped = new GraphBuilder()
      .addVertex(name(0))
      .addVertex(name(1))
      .addEdge(name(0), name(0))
      .addEdge(name(0), name(1))
      .build();
    expect(communities(looped).size).toBe(2);
  });

  it('keeps isolated vertices apart and respects the iteration cap', () => {
    expect(communities(pathGraph(1)).get(name(0))).toBe(0);
    expect(new Set(communities(cycleGraph(4), 0).values()).size).toBe(4);
  });
});

describe('cliques', () => {
  it('finds maximal cliques', () => {
    expect(maximalCliques(completeGraph(4))).toHaveLength(1);
    expect(maximumClique(completeGraph(4))).toHaveLength(4);
    expect(maximalCliques(cycleGraph(5))).toHaveLength(5);
    expect(maximumClique(new GraphBuilder().build())).toEqual([]);
    expect(maximalCliques(new GraphBuilder().build())).toEqual([]);
  });

  it('agrees with brute force on small random graphs', () => {
    fc.assert(
      fc.property(fc.nat(300), (seed) => {
        const graph = randomGraph(7, { probability: 0.5, seed });
        const largest = maximumClique(graph).length;
        const isClique = (mask: number): boolean => {
          const members = graph.vertices().filter((_, index) => (mask >> index) & 1);
          return members.every((left) =>
            members.every((right) => left === right || graph.hasEdge(left, right)),
          );
        };
        const best = Math.max(
          0,
          ...Array.from({ length: 128 }, (_, mask) =>
            isClique(mask) ? mask.toString(2).replaceAll('0', '').length : 0,
          ),
        );
        expect(largest).toBe(best);
      }),
    );
  });

  it('rejects directed graphs', () => {
    expect(() => maximalCliques(network(2, []))).toThrow(GraphError);
  });
});
