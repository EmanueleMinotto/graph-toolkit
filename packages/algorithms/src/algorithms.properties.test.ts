import { GraphError, type Graph } from '@graph-sdk/core';
import {
  arbEdgesAmong,
  arbGraph,
  arbPermutation,
  BRUTE_FORCE,
  buildGraph,
  name,
  range,
  relabel,
  type Pair,
} from '@graph-sdk/test-utils';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  articulationPoints,
  betweennessCentrality,
  biconnectedComponents,
  bridges,
  center,
  clusteringCoefficients,
  diameter,
  eccentricities,
  globalMinCut,
  isPlanar,
  kCores,
  leiden,
  louvain,
  maxFlow,
  maxFlowDinic,
  maximalCliques,
  maximumBipartiteMatching,
  maximumClique,
  maximumMatching,
  minCut,
  minimumCostAssignment,
  pageRank,
  radius,
  transitiveClosure,
  treewidth,
  treewidthUpperBound,
} from './index.js';

// --- shared helpers: small, independent re-statements of the definitions ---------------------------

const byText = (left: string, right: string): number => left.localeCompare(right);
const byNumber = (left: number, right: number): number => left - right;
const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

/** Every subset of 0..n-1 as a sorted array. */
const subsetsOf = (n: number): number[][] =>
  Array.from({ length: 2 ** n }, (_, mask) => range(n).filter((bit) => (mask >> bit) % 2 === 1));

const choose = (items: readonly number[], size: number): number[][] =>
  size === 0
    ? [[]]
    : items.flatMap((item, index) =>
        choose(items.slice(index + 1), size - 1).map((rest) => [item, ...rest]),
      );

/** Index pairs of the edges (source, target order as stored). */
const pairsOf = (graph: Graph): Pair[] =>
  graph.edges().map(({ source, target }): Pair => [graph.indexOf(source), graph.indexOf(target)]);

/** Adjacency sets of the underlying undirected graph, loops ignored. */
function sets(n: number, pairs: readonly Pair[]): Set<number>[] {
  const around = range(n).map(() => new Set<number>());

  const loopFree = pairs.filter(([a, b]) => a !== b);

  for (const [from, to] of loopFree) {
    around[from]!.add(to);
    around[to]!.add(from);
  }

  return around;
}

/** Vertices of `alive` reachable from `start` (direction ignored). */
function reachableFrom(
  around: readonly Set<number>[],
  alive: ReadonlySet<number>,
  start: number,
): Set<number> {
  const seen = new Set([start]);
  const stack = [start];

  for (let current = stack.pop(); current !== undefined; current = stack.pop()) {
    const fresh = [...around[current]!].filter((next) => alive.has(next) && !seen.has(next));

    for (const next of fresh) {
      seen.add(next);
    }

    stack.push(...fresh);
  }

  return seen;
}

/** Number of connected components among `alive` vertices (direction ignored). */
function componentsAmong(around: readonly Set<number>[], alive: ReadonlySet<number>): number {
  const seen = new Set<number>();
  let count = 0;

  for (const start of alive) {
    if (seen.has(start)) {
      continue;
    }

    count += 1;
    reachableFrom(around, alive, start).forEach((vertex) => seen.add(vertex));
  }

  return count;
}

/** Hop distances between all pairs by Floyd–Warshall (`Infinity` when unreachable). */
function hopMatrix(graph: Graph): number[][] {
  const n = graph.vertexCount;
  const hops = range(n).map((from) => range(n).map((to) => (from === to ? 0 : Infinity)));
  const triples = range(n).flatMap((via) =>
    range(n).flatMap((from) => range(n).map((to): [number, number, number] => [via, from, to])),
  );

  for (const [from, to] of pairsOf(graph)) {
    hops[from]![to] = Math.min(hops[from]![to]!, 1);
    hops[to]![from] = graph.directed ? hops[to]![from]! : Math.min(hops[to]![from]!, 1);
  }

  for (const [via, from, to] of triples) {
    hops[from]![to] = Math.min(hops[from]![to]!, hops[from]![via]! + hops[via]![to]!);
  }

  return hops;
}

/** Width of an elimination order: the largest neighbourhood met while removing vertices one by one. */
function eliminationWidth(n: number, pairs: readonly Pair[], order: readonly number[]): number {
  const around = sets(n, pairs);
  let width = 0;

  for (const vertex of order) {
    const rest = [...around[vertex]!];

    width = Math.max(width, rest.length);

    const fill = rest.flatMap((one) =>
      rest.filter((other) => other !== one).map((other): Pair => [one, other]),
    );

    for (const one of rest) {
      around[one]!.delete(vertex);
    }

    for (const [one, other] of fill) {
      around[one]!.add(other);
    }
  }

  return width;
}

const permutations = (items: readonly number[]): number[][] =>
  items.length === 0
    ? [[]]
    : items.flatMap((item) =>
        permutations(items.filter((other) => other !== item)).map((rest) => [item, ...rest]),
      );

const key = (from: number, to: number): string => `${String(from)}>${String(to)}`;

const arbDirection = fc.boolean();
const arbSimple = (extra: {
  directed?: boolean;
  weighted?: boolean;
  minN?: number;
  maxN?: number;
}) => arbGraph({ maxN: 7, ...extra });

// --- flows and cuts -----------------------------------------------------------------------------------

/** Cheapest set of edges separating `source` from `sink`, by trying every vertex bipartition. */
function cheapestCut(graph: Graph, source: number, sink: number): number {
  const others = range(graph.vertexCount).filter((vertex) => vertex !== source && vertex !== sink);

  return Math.min(
    ...subsetsOf(others.length).map((picked) => {
      const inside = new Set([source, ...picked.map((index) => others[index]!)]);

      return sum(
        graph
          .edges()
          .filter(({ source: from, target: to }) => {
            const [a, b] = [inside.has(graph.indexOf(from)), inside.has(graph.indexOf(to))];

            return graph.directed ? a && !b : a !== b;
          })
          .map(({ weight }) => weight),
      );
    }),
  );
}

const arbNetwork = arbSimple({ directed: true, weighted: true, minN: 2 }).chain((graph) =>
  fc
    .tuple(
      fc.integer({ min: 0, max: graph.vertexCount - 1 }),
      fc.integer({ min: 1, max: graph.vertexCount - 1 }),
    )
    .map(([from, step]) => [graph, from, (from + step) % graph.vertexCount] as const),
);

describe('flows and cuts', () => {
  it('flows need a directed graph', () => {
    fc.assert(
      fc.property(arbSimple({ directed: false, minN: 2 }), (graph) => {
        expect(() => maxFlow(graph, name(0), name(1))).toThrow(GraphError);
        expect(() => minCut(graph, name(0), name(1))).toThrow(GraphError);
      }),
    );
  });

  it('max flow equals the cheapest cut found by trying every bipartition, for both flow algorithms', () => {
    fc.assert(
      fc.property(arbNetwork, ([graph, from, to]) => {
        const [source, sink] = [name(from), name(to)];
        const wanted = cheapestCut(graph, from, to);

        expect(maxFlow(graph, source, sink)).toBe(wanted);
        expect(maxFlowDinic(graph, source, sink)).toBe(wanted);
        expect(minCut(graph, source, sink).value).toBe(wanted);
      }),
      BRUTE_FORCE,
    );
  });

  it('minCut returns a real cut: terminals on their sides, partition of the vertices, value = crossing weight', () => {
    fc.assert(
      fc.property(arbNetwork, ([graph, from, to]) => {
        const cut = minCut(graph, name(from), name(to));
        const onSource = new Set(cut.sourceSide);

        expect(cut.sourceSide).toContain(name(from));
        expect(cut.sinkSide).toContain(name(to));

        expect([...cut.sourceSide, ...cut.sinkSide].toSorted(byText)).toEqual(
          graph.vertices().toSorted(byText),
        );

        expect(sum(cut.edges.map(({ weight }) => weight))).toBe(cut.value);

        expect(
          cut.edges.every(({ source, target }) => onSource.has(source) && !onSource.has(target)),
        ).toBe(true);
      }),
    );
  });

  it('globalMinCut equals the lightest of all two-sided partitions and is a real cut', () => {
    fc.assert(
      fc.property(arbSimple({ directed: false, weighted: true, minN: 2 }), (graph) => {
        const cut = globalMinCut(graph);
        const n = graph.vertexCount;
        const crossing = (inside: ReadonlySet<number>): number =>
          sum(
            graph
              .edges()
              .filter(
                ({ source, target }) =>
                  inside.has(graph.indexOf(source)) !== inside.has(graph.indexOf(target)),
              )
              .map(({ weight }) => weight),
          );
        const lightest = Math.min(
          ...subsetsOf(n - 1)
            .filter((rest) => rest.length < n - 1)
            .map((rest) => crossing(new Set([n - 1, ...rest]))),
        );
        const side = new Set(cut.side.map((id) => graph.indexOf(id)));

        expect(cut.value).toBe(lightest);
        expect(cut.side.length + cut.otherSide.length).toBe(n);
        expect(cut.side.length).toBeGreaterThan(0);
        expect(cut.otherSide.length).toBeGreaterThan(0);
        expect(crossing(side)).toBe(cut.value);
      }),
      BRUTE_FORCE,
    );
  });
});

// --- matching and assignment -------------------------------------------------------------------------

/** Size of the largest set of pairwise disjoint edges, by exhaustive recursion. */
function bestMatching(pairs: readonly Pair[], used: ReadonlySet<number> = new Set()): number {
  const [first, ...rest] = pairs;

  if (first === undefined) {
    return 0;
  }

  const [from, to] = first;
  const skip = bestMatching(rest, used);
  const free = !used.has(from) && !used.has(to) && from !== to;

  return free ? Math.max(skip, 1 + bestMatching(rest, new Set([...used, from, to]))) : skip;
}

const arbBipartite = fc
  .tuple(fc.integer({ min: 1, max: 4 }), fc.integer({ min: 1, max: 4 }))
  .chain(([left, right]) =>
    arbEdgesAmong(
      range(left).flatMap((from) => range(right).map((to): Pair => [from, left + to])),
    ).map((edges) => [buildGraph(left + right, edges), left, right] as const),
  );

describe('matching', () => {
  it('maximumMatching finds as many pairs as exhaustive search, using each vertex once and real edges only', () => {
    fc.assert(
      fc.property(arbSimple({ directed: false, maxN: 8 }), (graph) => {
        const matching = maximumMatching(graph);
        const vertices = matching.pairs.flat();

        expect(matching.size).toBe(bestMatching(pairsOf(graph)));
        expect(matching.pairs).toHaveLength(matching.size);
        expect(new Set(vertices).size).toBe(vertices.length);
        expect(matching.pairs.every(([from, to]) => graph.hasEdge(from, to))).toBe(true);
      }),
      BRUTE_FORCE,
    );
  });

  it('Hopcroft–Karp agrees with exhaustive search and with the general algorithm on bipartite graphs', () => {
    fc.assert(
      fc.property(arbBipartite, ([graph, left, right]) => {
        const matching = maximumBipartiteMatching(graph);

        expect(matching.size).toBe(bestMatching(pairsOf(graph)));
        expect(matching.size).toBe(maximumMatching(graph).size);
        expect(matching.size).toBeLessThanOrEqual(Math.min(left, right));
        expect(matching.pairs.every(([from, to]) => graph.hasEdge(from, to))).toBe(true);
      }),
      BRUTE_FORCE,
    );
  });

  it('the Hungarian method finds the cheapest injective assignment', () => {
    const arbCosts = fc
      .tuple(fc.integer({ min: 1, max: 4 }), fc.integer({ min: 0, max: 2 }))
      .chain(([rows, extra]) =>
        fc.array(
          fc.array(fc.integer({ min: -5, max: 9 }), {
            minLength: rows + extra,
            maxLength: rows + extra,
          }),
          { minLength: rows, maxLength: rows },
        ),
      );
    const cheapest = (
      costs: readonly (readonly number[])[],
      used: ReadonlySet<number> = new Set(),
    ): number => {
      const [row, ...rest] = costs;

      return row === undefined
        ? 0
        : Math.min(
            ...row
              .map((cost, column) => ({ cost, column }))
              .filter(({ column }) => !used.has(column))
              .map(({ cost, column }) => cost + cheapest(rest, new Set([...used, column]))),
          );
    };

    fc.assert(
      fc.property(arbCosts, (costs) => {
        const { assignment, cost } = minimumCostAssignment(costs);

        expect(cost).toBe(cheapest(costs));
        expect(new Set(assignment).size).toBe(costs.length);
        expect(sum(assignment.map((column, row) => costs[row]![column]!))).toBe(cost);
      }),
      BRUTE_FORCE,
    );
  });
});

// --- structure --------------------------------------------------------------------------------------

describe('structure', () => {
  it('articulation points and bridges agree with deleting each vertex or edge and counting components', () => {
    fc.assert(
      fc.property(arbSimple({ directed: false, maxN: 8 }), (graph) => {
        const [n, pairs] = [graph.vertexCount, pairsOf(graph)];
        const around = sets(n, pairs);
        const everyone = new Set(range(n));
        const base = componentsAmong(around, everyone);
        const cutVertices = range(n).filter((vertex) => {
          const alive = new Set(everyone);

          alive.delete(vertex);

          return componentsAmong(around, alive) > base - (around[vertex]!.size === 0 ? 1 : 0);
        });
        const cutEdges = pairs.filter(([from, to]) => {
          const without = sets(
            n,
            pairs.filter(([a, b]) => !(a === from && b === to)),
          );

          return componentsAmong(without, everyone) > base;
        });

        expect(
          articulationPoints(graph)
            .map((id) => graph.indexOf(id))
            .toSorted(byNumber),
        ).toEqual(cutVertices);

        expect(
          bridges(graph)
            .map(([from, to]) =>
              [graph.indexOf(from), graph.indexOf(to)].toSorted(byNumber).join('-'),
            )
            .toSorted(byText),
        ).toEqual(
          cutEdges.map(([from, to]) => [from, to].toSorted(byNumber).join('-')).toSorted(byText),
        );
      }),
      BRUTE_FORCE,
    );
  });

  it('every edge lies in exactly one biconnected component, and shared vertices are articulation points', () => {
    fc.assert(
      fc.property(arbSimple({ directed: false, maxN: 8 }), (graph) => {
        const blocks = biconnectedComponents(graph).map((block) => new Set(block));
        const joints = new Set(articulationPoints(graph));
        const shared = graph
          .vertices()
          .filter((id) => blocks.filter((block) => block.has(id)).length > 1);

        for (const { source, target } of graph.edges()) {
          expect(blocks.filter((block) => block.has(source) && block.has(target))).toHaveLength(1);
        }

        expect(shared.every((id) => joints.has(id))).toBe(true);
        expect([...joints].every((id) => shared.includes(id))).toBe(true);
      }),
    );
  });

  it('core numbers match repeatedly peeling vertices of too small degree', () => {
    fc.assert(
      fc.property(arbSimple({ directed: false, maxN: 8 }), (graph) => {
        const around = sets(graph.vertexCount, pairsOf(graph));
        const survivors = (k: number): Set<number> => {
          const alive = new Set(range(graph.vertexCount));

          for (let changed = true; changed;) {
            const weak = [...alive].filter(
              (vertex) => [...around[vertex]!].filter((next) => alive.has(next)).length < k,
            );

            for (const vertex of weak) {
              alive.delete(vertex);
            }

            changed = weak.length > 0;
          }

          return alive;
        };
        const scores = kCores(graph);

        for (const [index, id] of graph.vertices().entries()) {
          const wanted = Math.max(
            ...range(graph.vertexCount + 1).filter((k) => survivors(k).has(index)),
          );

          expect(scores.get(id)).toBe(wanted);
        }
      }),
    );
  });

  it('clustering coefficients are closed triangles over possible ones', () => {
    fc.assert(
      fc.property(arbSimple({ directed: false }), (graph) => {
        const around = sets(graph.vertexCount, pairsOf(graph));
        const scores = clusteringCoefficients(graph);

        for (const [index, id] of graph.vertices().entries()) {
          const friends = [...around[index]!];
          const closed = choose(friends, 2).filter(([a, b]) => around[a!]!.has(b!)).length;
          const possible = (friends.length * (friends.length - 1)) / 2;

          expect(scores.get(id)).toBeCloseTo(possible === 0 ? 0 : closed / possible, 12);
        }
      }),
    );
  });

  it('eccentricity, diameter, radius and center match all-pairs hop distances', () => {
    fc.assert(
      fc.property(
        arbDirection.chain((directed) => arbSimple({ directed })),
        (graph) => {
          const n = graph.vertexCount;
          const farthest = hopMatrix(graph).map((row) => Math.max(...row));
          const smallest = Math.min(...farthest);

          expect([...eccentricities(graph).values()]).toEqual(farthest);
          expect(diameter(graph)).toBe(n === 0 ? 0 : Math.max(...farthest));
          expect(radius(graph)).toBe(n === 0 ? 0 : smallest);

          expect(center(graph).map((id) => graph.indexOf(id))).toEqual(
            n === 0 ? [] : range(n).filter((vertex) => farthest[vertex] === smallest),
          );
        },
      ),
      BRUTE_FORCE,
    );
  });

  it('transitiveClosure has an arc u → v exactly when v ≠ u is reachable from u', () => {
    fc.assert(
      fc.property(
        arbDirection.chain((directed) => arbSimple({ directed })),
        (graph) => {
          const hops = hopMatrix(graph);
          const closure = transitiveClosure(graph);
          const expected = range(graph.vertexCount).flatMap((from) =>
            range(graph.vertexCount)
              .filter((to) => from !== to && hops[from]![to]! < Infinity)
              .map((to) => key(from, to)),
          );

          expect(closure.directed).toBe(true);

          expect(
            pairsOf(closure)
              .map(([from, to]) => key(from, to))
              .toSorted(byText),
          ).toEqual(expected.toSorted(byText));
        },
      ),
    );
  });

  it('betweenness over all vertices adds up to Σ (distance − 1) over connected pairs', () => {
    fc.assert(
      fc.property(arbSimple({ directed: false }), (graph) => {
        const hops = hopMatrix(graph);
        const interior = range(graph.vertexCount).flatMap((from) =>
          range(graph.vertexCount)
            .filter((to) => to > from && hops[from]![to]! < Infinity)
            .map((to) => hops[from]![to]! - 1),
        );

        expect(sum([...betweennessCentrality(graph).values()])).toBeCloseTo(sum(interior), 9);
      }),
    );
  });
});

// --- planarity, cliques, treewidth -----------------------------------------------------------------------

/** Planarity of a six-vertex graph: no K5, subdivided K5 or K3,3 (Kuratowski). */
function containsForbidden(graph: Graph): boolean {
  const all = range(6);
  const has = (left: number, right: number): boolean => graph.hasEdge(name(left), name(right));
  const complete = (set: readonly number[], skip: readonly number[] = []): boolean =>
    choose(set, 2).every(
      (pair) => (pair[0] === skip[0] && pair[1] === skip[1]) || has(pair[0]!, pair[1]!),
    );
  const subdivided = (set: readonly number[]): boolean => {
    const outside = all.find((vertex) => !set.includes(vertex))!;

    return choose(set, 2).some(
      (pair) => complete(set, pair) && has(pair[0]!, outside) && has(outside, pair[1]!),
    );
  };
  const bipartite = (left: readonly number[]): boolean => {
    const right = all.filter((vertex) => !left.includes(vertex));

    return left.every((one) => right.every((other) => has(one, other)));
  };

  return (
    choose(all, 5).some((set) => complete(set) || subdivided(set)) ||
    choose(all, 3).some((left) => bipartite(left))
  );
}

describe('planarity, cliques and treewidth', () => {
  it('isPlanar rejects exactly the six-vertex graphs containing K5, a subdivided K5 or K3,3', () => {
    fc.assert(
      fc.property(arbGraph({ minN: 6, maxN: 6 }), (graph) => {
        expect(isPlanar(graph)).toBe(!containsForbidden(graph));
      }),
      BRUTE_FORCE,
    );
  });

  it('planarity survives deleting edges and renaming vertices, and obeys the 3n − 6 edge bound', () => {
    fc.assert(
      fc.property(
        arbSimple({ directed: false, minN: 3, maxN: 8 }).chain((graph) =>
          fc.tuple(
            fc.constant(graph),
            arbPermutation(graph.vertexCount),
            fc.subarray(range(graph.edgeCount)),
          ),
        ),
        ([graph, order, dropped]) => {
          const edges = pairsOf(graph).filter((_, index) => !dropped.includes(index));
          const smaller = buildGraph(
            graph.vertexCount,
            edges.map(([from, to]) => [from, to, 1]),
          );

          expect(isPlanar(relabel(graph, order))).toBe(isPlanar(graph));
          expect(!isPlanar(graph) || graph.edgeCount <= 3 * graph.vertexCount - 6).toBe(true);
          expect(!isPlanar(graph) || isPlanar(smaller)).toBe(true);
        },
      ),
    );
  });

  it('maximalCliques lists exactly the cliques no vertex can extend; maximumClique is a largest one', () => {
    fc.assert(
      fc.property(arbSimple({ directed: false }), (graph) => {
        const around = sets(graph.vertexCount, pairsOf(graph));
        const isClique = (set: readonly number[]): boolean =>
          choose(set, 2).every(([a, b]) => around[a!]!.has(b!));
        const maximal = subsetsOf(graph.vertexCount).filter(
          (set) =>
            set.length > 0 &&
            isClique(set) &&
            range(graph.vertexCount).every(
              (extra) => set.includes(extra) || !isClique([...set, extra]),
            ),
        );
        const listed = maximalCliques(graph).map((clique) =>
          clique
            .map((id) => graph.indexOf(id))
            .toSorted(byNumber)
            .join(','),
        );
        const largest = Math.max(0, ...maximal.map((set) => set.length));

        expect(listed.toSorted(byText)).toEqual(
          maximal.map((set) => set.join(',')).toSorted(byText),
        );

        expect(maximumClique(graph)).toHaveLength(largest);
        expect(isClique(maximumClique(graph).map((id) => graph.indexOf(id)))).toBe(true);
      }),
      BRUTE_FORCE,
    );
  });

  it('treewidth equals the best elimination order, never exceeds the heuristic bound, and ignores vertex names', () => {
    fc.assert(
      fc.property(
        arbSimple({ directed: false, maxN: 6 }).chain((graph) =>
          fc.tuple(fc.constant(graph), arbPermutation(graph.vertexCount)),
        ),
        ([graph, order]) => {
          const widths = permutations(range(graph.vertexCount)).map((elimination) =>
            eliminationWidth(graph.vertexCount, pairsOf(graph), elimination),
          );
          const width = treewidth(graph);

          expect(width).toBe(Math.min(...widths));
          expect(width).toBeLessThanOrEqual(treewidthUpperBound(graph));
          expect(treewidth(relabel(graph, order))).toBe(width);
        },
      ),
      BRUTE_FORCE,
    );
  });
});

// --- ranking and communities -------------------------------------------------------------------------

describe('ranking and communities', () => {
  it('PageRank is a probability distribution that does not depend on vertex names', () => {
    fc.assert(
      fc.property(
        arbDirection
          .chain((directed) => arbSimple({ directed, minN: 1 }))
          .chain((graph) => fc.tuple(fc.constant(graph), arbPermutation(graph.vertexCount))),
        ([graph, order]) => {
          const ranks = pageRank(graph);
          const moved = pageRank(relabel(graph, order));

          expect(sum([...ranks.values()])).toBeCloseTo(1, 6);
          expect(ranks.values().every((value) => value > 0)).toBe(true);

          for (const [index, id] of graph.vertices().entries()) {
            expect(moved.get(name(order[Number(id)]!))).toBeCloseTo(ranks.get(id)!, 6);
            expect(index).toBe(graph.indexOf(id));
          }
        },
      ),
    );
  });

  it.each([
    ['louvain', louvain],
    ['leiden', leiden],
  ])(
    '%s gives connected communities numbered by first appearance, deterministically',
    (_, detect) => {
      fc.assert(
        fc.property(
          arbSimple({ directed: false, weighted: true, maxN: 8 }),
          fc.double({ min: 0.2, max: 3, noNaN: true }),
          (graph, resolution) => {
            const labels = detect(graph, { resolution });
            const around = sets(graph.vertexCount, pairsOf(graph));
            const order = graph.vertices().map((id) => labels.get(id)!);

            expect(labels.size).toBe(graph.vertexCount);
            expect([...new Set(order)]).toEqual(range(new Set(order).size));

            const groups = new Set(order);

            for (const group of groups) {
              const members = graph
                .vertices()
                .filter((id) => labels.get(id) === group)
                .map((id) => graph.indexOf(id));

              expect(componentsAmong(around, new Set(members))).toBe(1);
            }

            expect([...detect(graph, { resolution })]).toEqual([...labels]);
          },
        ),
      );
    },
  );

  it.each([
    ['louvain', louvain],
    ['leiden', leiden],
  ])('%s refuses non-positive resolutions', (_, detect) => {
    fc.assert(
      fc.property(
        arbSimple({ directed: false }),
        fc.double({ min: -3, max: 0, noNaN: true }),
        (graph, resolution) => {
          expect(() => detect(graph, { resolution })).toThrow('resolution');
        },
      ),
    );
  });
});
