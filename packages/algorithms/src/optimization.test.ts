import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-toolkit/core';
import {
  completeGraph,
  cycleGraph,
  pathGraph,
  petersenGraph,
  randomGraph,
} from '@graph-toolkit/generators';
import { describe, expect, it } from 'vitest';
import {
  maximalCliques,
  maximumClique,
  maximumMatching,
  minCostFlow,
  minimumCostAssignment,
} from './index.js';

const v = (index: number) => vertexId(String(index));

function build(
  directed: boolean,
  count: number,
  arcs: readonly (readonly [number, number, number?])[],
): Graph {
  const builder = new GraphBuilder({ directed });
  for (let index = 0; index < count; index++) builder.addVertex(v(index));
  for (const [from, to, weight] of arcs) builder.addEdge(v(from), v(to), weight);
  return builder.build();
}

describe('maximumMatching (blossom)', () => {
  it('matches odd cycles and complete graphs', () => {
    expect(maximumMatching(cycleGraph(5)).size).toBe(2);
    expect(maximumMatching(completeGraph(6)).size).toBe(3);
    expect(maximumMatching(petersenGraph()).size).toBe(5);
    expect(maximumMatching(pathGraph(0)).size).toBe(0);
  });

  it('finds augmenting paths through blossoms', () => {
    // Triangle 0-1-2 with tails 2-3 and 0-4: needs the blossom to reach a perfect-ish matching.
    const graph = build(false, 6, [
      [0, 1],
      [1, 2],
      [2, 0],
      [2, 3],
      [0, 4],
      [3, 5],
    ]);
    expect(maximumMatching(graph).size).toBe(3);
  });

  it('returns disjoint pairs and ignores self-loops', () => {
    const graph = build(false, 3, [
      [0, 0],
      [0, 1],
      [1, 2],
    ]);
    const { pairs, size } = maximumMatching(graph);
    expect(size).toBe(1);
    expect(new Set(pairs.flat()).size).toBe(2 * pairs.length);
  });

  it('rejects directed graphs', () => {
    expect(() => maximumMatching(completeGraph(3, { directed: true }))).toThrow(GraphError);
  });
});

/** Exhaustive maximum matching size over the edge list. */
function bruteForce(
  edges: readonly (readonly [string, string])[],
  used: ReadonlySet<string>,
): number {
  const [head, ...rest] = edges;
  if (head === undefined) return 0;
  const skip = bruteForce(rest, used);
  return used.has(head[0]) || used.has(head[1]) || head[0] === head[1]
    ? skip
    : Math.max(skip, 1 + bruteForce(rest, new Set([...used, ...head])));
}

describe('maximumMatching against brute force', () => {
  it('agrees on random graphs', () => {
    for (let seed = 1; seed <= 80; seed++) {
      const graph = randomGraph(8, { probability: 0.35, seed });
      const edges = graph.edges().map((edge) => [edge.source, edge.target] as const);
      expect(maximumMatching(graph).size).toBe(bruteForce(edges, new Set()));
    }
  });
});

describe('minimumCostAssignment', () => {
  it('solves a square instance', () => {
    const result = minimumCostAssignment([
      [4, 1, 3],
      [2, 0, 5],
      [3, 2, 2],
    ]);
    expect(result.cost).toBe(5);
    expect(new Set(result.assignment).size).toBe(3);
  });

  it('allows more columns than rows and negative costs', () => {
    expect(
      minimumCostAssignment([
        [5, -1, 7],
        [4, 3, -2],
      ]),
    ).toEqual({ assignment: [1, 2], cost: -3 });
    expect(minimumCostAssignment([])).toEqual({ assignment: [], cost: 0 });
  });

  it('rejects ragged and tall matrices', () => {
    expect(() => minimumCostAssignment([[1, 2], [3]])).toThrow(GraphError);
    expect(() => minimumCostAssignment([[1], [2]])).toThrow(GraphError);
  });
});

describe('minCostFlow', () => {
  // 0→1 (cap 2, cost 1), 0→2 (cap 2, cost 5), 1→3 (cap 1, cost 1), 1→2 (cap 1, cost 1), 2→3 (cap 3, cost 1)
  const network = build(true, 4, [
    [0, 1, 1],
    [0, 2, 5],
    [1, 3, 1],
    [1, 2, 1],
    [2, 3, 1],
  ]);
  const capacities: Record<string, number> = { '0>1': 2, '0>2': 2, '1>3': 1, '1>2': 1, '2>3': 3 };
  const capacity = (edge: { source: string; target: string }) =>
    capacities[`${edge.source}>${edge.target}`] ?? 0;
  const ends = { source: v(0), sink: v(3) };

  it('computes min-cost maximum flow', () => {
    expect(minCostFlow(network, ends, { capacity })).toEqual({ flow: 4, cost: 17 });
  });

  it('stops at the requested amount', () => {
    expect(minCostFlow(network, ends, { capacity, amount: 1 })).toEqual({ flow: 1, cost: 2 });
  });

  it('rejects bad input', () => {
    expect(() => minCostFlow(pathGraph(3), ends, { capacity })).toThrow(GraphError);
    expect(() => minCostFlow(network, { source: v(0), sink: v(0) }, { capacity })).toThrow(
      GraphError,
    );
    expect(() => minCostFlow(network, ends, { capacity: () => -1 })).toThrow(GraphError);
  });
});

const aborted = (): { aborted: boolean; throwIfAborted: () => void } => ({
  aborted: true,
  throwIfAborted: () => {
    throw new Error('stop');
  },
});
const live = {
  aborted: false,
  throwIfAborted: () => {
    /* never aborted */
  },
};

describe('cancellation', () => {
  it('stops clique enumeration when the signal is already aborted', () => {
    const signal = aborted();
    expect(() => maximalCliques(completeGraph(6), { signal })).toThrow('stop');
    expect(() => maximumClique(completeGraph(6), { signal })).toThrow('stop');
    expect(maximumClique(completeGraph(4), { signal: live })).toHaveLength(4);
  });
});
