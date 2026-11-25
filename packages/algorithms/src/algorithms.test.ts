import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-sdk/core';
import { cycleGraph, starGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import { maxFlow, pageRank } from './index.js';

const name = (index: number) => vertexId(String(index));

const network = (count: number, arcs: readonly (readonly [number, number, number])[]): Graph => {
  const builder = new GraphBuilder({ directed: true });
  for (let index = 0; index < count; index++) builder.addVertex(name(index));
  for (const [from, to, capacity] of arcs) builder.addEdge(name(from), name(to), capacity);
  return builder.build();
};

describe('maxFlow', () => {
  it('solves the CLRS network (23)', () => {
    const graph = network(6, [
      [0, 1, 16],
      [0, 2, 13],
      [1, 2, 10],
      [2, 1, 4],
      [1, 3, 12],
      [3, 2, 9],
      [2, 4, 14],
      [4, 3, 7],
      [3, 5, 20],
      [4, 5, 4],
    ]);
    expect(maxFlow(graph, name(0), name(5))).toBe(23);
  });

  it('returns 0 when the sink is unreachable', () => {
    expect(maxFlow(network(3, [[0, 1, 5]]), name(0), name(2))).toBe(0);
  });

  it('validates its input', () => {
    const graph = network(2, [[0, 1, 1]]);
    expect(() => maxFlow(graph, name(0), name(0))).toThrow(GraphError);
    expect(() => maxFlow(cycleGraph(3), name(0), name(1))).toThrow(GraphError);
    expect(() => maxFlow(network(2, [[0, 1, -1]]), name(0), name(1))).toThrow(GraphError);
  });
});

describe('pageRank', () => {
  it('is uniform on a cycle and sums to 1', () => {
    const ranks = pageRank(cycleGraph(5));
    expect(ranks.values().every((rank) => Math.abs(rank - 0.2) < 1e-9)).toBe(true);
  });

  it('ranks the hub of a star highest', () => {
    const ranks = pageRank(starGraph(5));
    const total = ranks.values().reduce((sum, rank) => sum + rank, 0);
    expect(total).toBeCloseTo(1, 9);
    expect(ranks.get(name(0))!).toBeGreaterThan(ranks.get(name(1))!);
  });

  it('handles dangling vertices, empty graphs and iteration limits', () => {
    const ranks = pageRank(network(2, [[0, 1, 1]]), { maxIterations: 1 });
    expect(ranks.values().reduce((sum, rank) => sum + rank, 0)).toBeCloseTo(1, 9);
    expect(pageRank(network(0, [])).size).toBe(0);
  });
});
