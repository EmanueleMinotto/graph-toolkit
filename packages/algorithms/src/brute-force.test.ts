import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import {
  completeGraph,
  cycleGraph,
  hypercubeGraph,
  pathGraph,
  petersenGraph,
  randomGraph,
} from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  articulationPoints,
  bridges,
  isPlanar,
  leiden,
  louvain,
  maximumBipartiteMatching,
  maximumMatching,
  minCostFlow,
  minimumCostAssignment,
  pageRank,
  treewidth,
} from './index.js';

type Pair = readonly [number, number];

const name = (index: number) => vertexId(String(index));

const build = (count: number, pairs: readonly Pair[], weights: readonly number[] = []): Graph => {
  const builder = new GraphBuilder();

  for (let index = 0; index < count; index++) {
    builder.addVertex(name(index));
  }

  for (const [position, [from, to]] of pairs.entries()) {
    builder.addEdge(name(from), name(to), weights[position] ?? 1);
  }

  return builder.build();
};

const pairsOf = (graph: Graph): Pair[] =>
  graph.edges().map((edge): Pair => [Number(edge.source), Number(edge.target)]);

/** Size of a maximum matching, by exhaustive search. */
function bestMatching(pairs: readonly Pair[], used: ReadonlySet<number> = new Set()): number {
  const [first, ...rest] = pairs;

  if (first === undefined) {
    return 0;
  }

  const skipped = bestMatching(rest, used);

  return used.has(first[0]) || used.has(first[1]) || first[0] === first[1]
    ? skipped
    : Math.max(skipped, 1 + bestMatching(rest, new Set([...used, first[0], first[1]])));
}

const COUNT = 9;

function componentCount(pairs: readonly Pair[], skip = -1): number {
  const parent = Array.from({ length: COUNT }, (_, index) => index);
  const find = (vertex: number): number =>
    parent[vertex] === vertex ? vertex : find(parent[vertex]!);

  for (const [from, to] of pairs) {
    if (from !== skip && to !== skip) {
      parent[find(from)] = find(to);
    }
  }

  return new Set(
    parent.map((_root, vertex) => find(vertex)).filter((_root, vertex) => vertex !== skip),
  ).size;
}

const seeds = Array.from({ length: 40 }, (_, seed) => seed);

describe('matching against exhaustive search', () => {
  it('finds the maximum matching of random graphs', () => {
    for (const seed of seeds) {
      const graph = randomGraph(8, { probability: 0.3 + (seed % 4) * 0.1, seed });

      expect(maximumMatching(graph).size).toBe(bestMatching(pairsOf(graph)));
    }
  });

  it('finds the maximum matching of random bipartite graphs', () => {
    for (const seed of seeds) {
      const graph = randomGraph(10, { probability: 0.3 + (seed % 4) * 0.1, seed });
      const pairs = pairsOf(graph).filter(([from, to]) => (from + to) % 2 === 1);
      const bipartite = build(10, pairs);

      expect(maximumBipartiteMatching(bipartite).size).toBe(bestMatching(pairs));
    }
  });
});

describe('cut vertices and bridges against exhaustive search', () => {
  it('agrees with removing each vertex or edge', () => {
    for (const seed of seeds) {
      const graph = randomGraph(COUNT, { probability: 0.22, seed });
      const pairs = pairsOf(graph);
      const base = componentCount(pairs);
      const cutVertices = Array.from({ length: COUNT }, (_, vertex) => vertex).filter(
        (vertex) => componentCount(pairs, vertex) > base,
      );
      const cutEdges = pairs.filter(
        (_, index) => componentCount(pairs.filter((_edge, other) => other !== index)) > base,
      );

      expect(
        articulationPoints(graph)
          .map(Number)
          .toSorted((l, r) => l - r),
      ).toEqual(cutVertices);

      expect(bridges(graph)).toHaveLength(cutEdges.length);
    }
  });
});

describe('assignment against exhaustive search', () => {
  it('finds the cheapest injective assignment', () => {
    const cheapest = (
      costs: readonly (readonly number[])[],
      row = 0,
      taken: readonly number[] = [],
    ): number =>
      row === costs.length
        ? 0
        : Math.min(
            ...costs[row]!.map((cost, column) =>
              taken.includes(column)
                ? Infinity
                : cost + cheapest(costs, row + 1, [...taken, column]),
            ),
          );

    for (const seed of seeds) {
      const rows = 2 + (seed % 3);
      const columns = rows + (seed % 2);
      const costs = Array.from({ length: rows }, (_, row) =>
        Array.from(
          { length: columns },
          (_cell, column) => (((seed + 3) * (row + 5) * (column + 7) * 31) % 23) - 8,
        ),
      );
      const result = minimumCostAssignment(costs);

      expect(result.cost).toBe(cheapest(costs));
      expect(new Set(result.assignment).size).toBe(rows);

      expect(result.assignment.reduce((sum, column, row) => sum + costs[row]![column]!, 0)).toBe(
        result.cost,
      );
    }
  });
});

describe('planarity of known graphs', () => {
  it('classifies subdivisions and triangulations', () => {
    const subdividedK5 = build(6, [
      [0, 5],
      [5, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 2],
      [1, 3],
      [1, 4],
      [2, 3],
      [2, 4],
      [3, 4],
    ]);
    const octahedron = build(6, [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [5, 1],
      [5, 2],
      [5, 3],
      [5, 4],
      [1, 2],
      [2, 3],
      [3, 4],
      [4, 1],
    ]);
    const k5PlusPendant = build(6, [...pairsOf(completeGraph(5)), [4, 5]]);

    expect(isPlanar(subdividedK5)).toBe(false);
    expect(isPlanar(octahedron)).toBe(true);
    expect(isPlanar(k5PlusPendant)).toBe(false);
    expect(isPlanar(cycleGraph(9))).toBe(true);
    expect(isPlanar(hypercubeGraph(4))).toBe(false);
    expect(isPlanar(petersenGraph())).toBe(false);
  });
});

describe('treewidth of known graphs', () => {
  it('matches the textbook values', () => {
    expect(treewidth(pathGraph(6))).toBe(1);
    expect(treewidth(cycleGraph(6))).toBe(2);
    expect(treewidth(completeGraph(5))).toBe(4);
    expect(treewidth(petersenGraph())).toBe(4);
    expect(treewidth(hypercubeGraph(3))).toBe(3);
    expect(treewidth(build(2, []))).toBe(0);
  });
});

describe('minimum-cost flow', () => {
  const network = new GraphBuilder({ directed: true });

  for (const label of ['s', 'a', 'b', 't']) {
    network.addVertex(vertexId(label));
  }

  for (const [from, to, cost] of [
    ['s', 'a', 1],
    ['a', 't', 1],
    ['s', 'b', 5],
    ['b', 't', 5],
  ] as const) {
    network.addEdge(vertexId(from), vertexId(to), cost);
  }

  const graph = network.build();
  const ends = { source: vertexId('s'), sink: vertexId('t') };

  it('uses the cheap path first and the expensive one when needed', () => {
    expect(minCostFlow(graph, ends, { capacity: () => 1, amount: 1 })).toMatchObject({
      flow: 1,
      cost: 2,
    });

    expect(minCostFlow(graph, ends, { capacity: () => 1 })).toMatchObject({ flow: 2, cost: 12 });
    expect(minCostFlow(graph, ends, { capacity: () => 5, amount: 3 }).cost).toBe(2 * 3);
  });

  it('reroutes through reverse arcs when that is cheaper', () => {
    const cross = new GraphBuilder({ directed: true });

    for (const label of ['s', 'a', 'b', 't']) {
      cross.addVertex(vertexId(label));
    }

    for (const [from, to, cost] of [
      ['s', 'a', 1],
      ['s', 'b', 2],
      ['a', 'b', 1],
      ['a', 't', 3],
      ['b', 't', 1],
    ] as const) {
      cross.addEdge(vertexId(from), vertexId(to), cost);
    }

    expect(minCostFlow(cross.build(), ends, { capacity: () => 1 })).toMatchObject({
      flow: 2,
      cost: 8,
    });
  });
});

const cliqueEdges = (base: number): Pair[] =>
  [0, 1, 2, 3].flatMap((left) =>
    [0, 1, 2, 3].filter((right) => right > left).map((right): Pair => [base + left, base + right]),
  );

const ring = (cliques: number): Graph =>
  build(
    cliques * 4,
    Array.from({ length: cliques }, (_, clique): Pair[] => [
      ...cliqueEdges(clique * 4),
      [clique * 4 + 3, ((clique + 1) % cliques) * 4],
    ]).flat(),
  );

describe('communities of structured graphs', () => {
  it('recovers a ring of cliques', () => {
    for (const detect of [louvain, leiden]) {
      expect([...detect(ring(4)).values()]).toEqual([
        0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3,
      ]);
    }
  });

  it('merges everything at low resolution and splits everything at high resolution', () => {
    for (const detect of [louvain, leiden]) {
      expect(new Set(detect(ring(3), { resolution: 0.001 }).values()).size).toBe(1);
      expect(new Set(detect(ring(3), { resolution: 100 }).values()).size).toBe(12);
    }
  });

  it('follows edge weights', () => {
    const chain = build(
      4,
      [
        [0, 1],
        [1, 2],
        [2, 3],
      ],
      [10, 1, 10],
    );

    for (const detect of [louvain, leiden]) {
      expect([...detect(chain).values()]).toEqual([0, 0, 1, 1]);
    }
  });

  it('ignores direction and self-loops', () => {
    const base = ring(3);
    const directed = new GraphBuilder({ directed: true });

    for (const id of base.vertices()) {
      directed.addVertex(id);
      directed.addEdge(id, id);
    }

    for (const edge of base.edges()) {
      directed.addEdge(edge.source, edge.target);
    }

    for (const detect of [louvain, leiden]) {
      expect([...detect(directed.build()).values()]).toEqual([...detect(base).values()]);
    }
  });
});

describe('pageRank on a dangling vertex', () => {
  it('shares the rank of a sink uniformly', () => {
    const graph = new GraphBuilder({ directed: true })
      .addVertex(name(0))
      .addVertex(name(1))
      .addEdge(name(0), name(1))
      .build();
    const ranks = pageRank(graph);

    expect(ranks.get(name(0))!).toBeCloseTo(0.35087719, 5);
    expect(ranks.get(name(1))!).toBeCloseTo(0.64912281, 5);
  });
});
