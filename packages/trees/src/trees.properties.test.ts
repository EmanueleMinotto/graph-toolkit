import type { Edge, Graph, VertexId } from '@graph-sdk/core';
import {
  arbGraph,
  arbPermutation,
  arbTree,
  BRUTE_FORCE,
  buildGraph,
  canonical,
  name,
  range,
  relabel,
  type WeightedPair,
} from '@graph-sdk/test-utils';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  boruvkaMinimumSpanningForest,
  isForest,
  isTree,
  minimumSpanningArborescence,
  minimumSpanningForest,
  primMinimumSpanningForest,
  pruferCode,
  RootedTree,
  steinerTree,
  treeFromPruferCode,
} from './index.js';

const sum = (values: readonly number[]): number =>
  values.reduce((total, value) => total + value, 0);

const arbUndirected = arbGraph({ weighted: true, maxN: 5, minN: 1 });
const arbTreeOf = (min: number) =>
  arbTree({ weighted: true, maxN: 8 }).filter((tree) => tree.vertexCount >= min);

const indexPairs = (edges: readonly Edge[], graph: Graph): (readonly [number, number])[] =>
  edges.map(({ source, target }) => [graph.indexOf(source), graph.indexOf(target)] as const);

/** Components among all vertices using only `pairs`; with `acyclic`, `undefined` once an edge closes a cycle. */
function components(
  n: number,
  pairs: readonly (readonly [number, number])[],
): { count: number; acyclic: boolean } {
  const parent = range(n);
  const find = (x: number): number => (parent[x] === x ? x : find(parent[x]!));
  let count = n;
  let acyclic = true;

  for (const [from, to] of pairs) {
    const [a, b] = [find(from), find(to)];

    acyclic &&= a !== b;
    count -= Number(a !== b);
    parent[a] = b;
  }

  return { count, acyclic };
}

/** Lightest acyclic edge subset spanning every component, by trying all subsets. */
function bestForest(graph: Graph): number {
  const edges = graph.edges();
  const pairs = indexPairs(edges, graph);
  const target = components(graph.vertexCount, pairs).count;
  const subsets = Array.from({ length: 2 ** edges.length }, (_, mask) =>
    range(edges.length).filter((bit) => (mask >> bit) % 2 === 1),
  );
  const spanning = subsets.filter((chosen) => {
    const { count, acyclic } = components(
      graph.vertexCount,
      chosen.map((index) => pairs[index]!),
    );

    return acyclic && count === target;
  });

  return Math.min(...spanning.map((chosen) => sum(chosen.map((index) => edges[index]!.weight))));
}

/** Cheapest way to give every non-root vertex one incoming edge so that all reach the root. */
function cheapest(graph: Graph, root: number): number {
  const incoming = range(graph.vertexCount).map((vertex) =>
    graph.edges().filter(({ target }) => graph.indexOf(target) === vertex),
  );
  const reaches = (parent: readonly (Edge | undefined)[]): boolean =>
    parent.every((_, vertex) => {
      let current = vertex;

      for (let step = 0; current !== root && step <= parent.length; step++) {
        current = parent[current] === undefined ? root : graph.indexOf(parent[current]!.source);
      }

      return current === root;
    });
  const choose = (vertex: number, chosen: (Edge | undefined)[]): number => {
    if (vertex === graph.vertexCount) {
      return reaches(chosen) ? sum(chosen.map((edge) => edge?.weight ?? 0)) : Infinity;
    }

    return vertex === root
      ? choose(vertex + 1, [...chosen, undefined])
      : Math.min(
          Infinity,
          ...incoming[vertex]!.map((edge) => choose(vertex + 1, [...chosen, edge])),
        );
  };

  return choose(0, []);
}

/** Exact optimum: lightest spanning tree over any vertex set containing the terminals. */
function optimum(graph: Graph, terminals: readonly number[]): number {
  const subsets = Array.from({ length: 2 ** graph.vertexCount }, (_, mask) =>
    range(graph.vertexCount).filter((bit) => (mask >> bit) % 2 === 1),
  );
  const candidates = subsets
    .filter((set) => terminals.every((terminal) => set.includes(terminal)))
    .map((set) => {
      const inside = graph
        .edges()
        .filter(
          ({ source, target }) =>
            set.includes(graph.indexOf(source)) && set.includes(graph.indexOf(target)),
        );
      const sub = buildGraph(
        graph.vertexCount,
        inside.map(({ source, target, weight }): WeightedPair => [
          Number(source),
          Number(target),
          weight,
        ]),
      );
      const forest = minimumSpanningForest(sub);
      const linked =
        components(graph.vertexCount, indexPairs(forest.edges, sub)).count ===
        graph.vertexCount - set.length + 1;

      return linked ? forest.totalWeight : Infinity;
    });

  return Math.min(...candidates);
}

describe('trees properties', () => {
  describe('spanning forests', () => {
    it('Kruskal, Prim and Borůvka all find the lightest spanning forest', () => {
      fc.assert(
        fc.property(arbUndirected, (graph) => {
          const wanted = bestForest(graph);

          for (const forest of [
            minimumSpanningForest(graph),
            primMinimumSpanningForest(graph),
            boruvkaMinimumSpanningForest(graph),
          ]) {
            const { count, acyclic } = components(
              graph.vertexCount,
              indexPairs(forest.edges, graph),
            );

            expect(forest.totalWeight).toBe(wanted);
            expect(sum(forest.edges.map(({ weight }) => weight))).toBe(forest.totalWeight);
            expect(acyclic).toBe(true);

            expect(count).toBe(
              components(graph.vertexCount, indexPairs(graph.edges(), graph)).count,
            );

            expect(forest.edges.every(({ source, target }) => graph.hasEdge(source, target))).toBe(
              true,
            );
          }
        }),
        BRUTE_FORCE,
      );
    });

    it('isForest and isTree agree with a union-find count, on random graphs and on edited trees', () => {
      fc.assert(
        fc.property(arbGraph({ maxN: 6, allowSelfLoops: true }), (graph) => {
          const { count, acyclic } = components(
            graph.vertexCount,
            indexPairs(graph.edges(), graph),
          );

          expect(isForest(graph)).toBe(acyclic);
          expect(isTree(graph)).toBe(acyclic && count === 1 && graph.vertexCount > 0);
        }),
      );

      fc.assert(
        fc.property(arbTreeOf(3), (tree) => {
          const pairs = tree
            .edges()
            .map(({ source, target, weight }): WeightedPair => [
              Number(source),
              Number(target),
              weight,
            ]);
          const fewer = buildGraph(tree.vertexCount, pairs.slice(1));
          const loop = buildGraph(tree.vertexCount, [...pairs, [0, 0, 1]], {
            allowSelfLoops: true,
          });

          expect(isTree(tree)).toBe(true);
          expect(isForest(fewer) && !isTree(fewer)).toBe(true);
          expect(isForest(loop)).toBe(false);
        }),
      );
    });
  });

  describe('Prüfer codes', () => {
    it('round-trip a tree and give each vertex degree − 1 occurrences', () => {
      fc.assert(
        fc.property(arbTreeOf(2), (tree) => {
          const code = pruferCode(tree);
          const rebuilt = treeFromPruferCode(tree.vertices(), code);

          expect(code).toHaveLength(tree.vertexCount - 2);

          expect(canonical(rebuilt).edges.map((edge) => edge.split(':', 1)[0])).toEqual(
            canonical(tree).edges.map((edge) => edge.split(':', 1)[0]),
          );

          for (const id of tree.vertices()) {
            expect(code.filter((entry) => entry === id)).toHaveLength(tree.degree(id) - 1);
          }
        }),
        BRUTE_FORCE,
      );
    });

    it('every sequence of vertices decodes to a tree with the matching degrees', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2, max: 8 }).chain((n) =>
            fc.tuple(
              fc.constant(n),
              fc.array(fc.integer({ min: 0, max: n - 1 }), {
                minLength: n - 2,
                maxLength: n - 2,
              }),
            ),
          ),
          ([n, entries]) => {
            const vertices = range(n).map((index) => name(index));
            const tree = treeFromPruferCode(
              vertices,
              entries.map((entry) => name(entry)),
            );

            expect(isTree(tree)).toBe(true);
            expect(pruferCode(tree)).toEqual(entries.map((entry) => name(entry)));

            expect(vertices.map((id) => tree.degree(id))).toEqual(
              vertices.map((id) => entries.filter((entry) => name(entry) === id).length + 1),
            );
          },
        ),
      );
    });
  });

  describe('RootedTree', () => {
    it('parents, depths and children are consistent, and the LCA is the deepest shared ancestor', () => {
      fc.assert(
        fc.property(
          arbTreeOf(1).chain((tree) =>
            fc.tuple(fc.constant(tree), fc.constantFrom(...tree.vertices())),
          ),
          ([tree, root]) => {
            const rooted = new RootedTree(tree, root);
            const ancestors = (vertex: VertexId): VertexId[] => {
              const parent = rooted.parentOf(vertex);

              return parent === undefined ? [vertex] : [vertex, ...ancestors(parent)];
            };

            expect(rooted.parentOf(root)).toBeUndefined();
            expect(rooted.depthOf(root)).toBe(0);

            for (const vertex of tree.vertices()) {
              const chain = ancestors(vertex);

              expect(chain.at(-1)).toBe(root);
              expect(rooted.depthOf(vertex)).toBe(chain.length - 1);

              expect(
                rooted.childrenOf(vertex).every((child) => rooted.parentOf(child) === vertex),
              ).toBe(true);

              expect(rooted.lowestCommonAncestor(vertex, vertex)).toBe(vertex);
              expect(rooted.lowestCommonAncestor(root, vertex)).toBe(root);

              for (const other of tree.vertices()) {
                const shared = chain.find((candidate) => ancestors(other).includes(candidate));

                expect(rooted.lowestCommonAncestor(vertex, other)).toBe(shared);
                expect(rooted.lowestCommonAncestor(other, vertex)).toBe(shared);
              }
            }

            expect(sum(tree.vertices().map((id) => rooted.childrenOf(id).length))).toBe(
              tree.vertexCount - 1,
            );
          },
        ),
      );
    });

    it('the depth of a vertex equals its hop distance from the root in the tree', () => {
      fc.assert(
        fc.property(
          arbTreeOf(1).chain((tree) =>
            fc.tuple(fc.constant(tree), arbPermutation(tree.vertexCount)),
          ),
          ([tree, order]) => {
            const moved = relabel(tree, order);
            const [a, b] = [new RootedTree(tree, name(0)), new RootedTree(moved, name(order[0]!))];

            for (const id of tree.vertices()) {
              expect(b.depthOf(name(order[Number(id)]!))).toBe(a.depthOf(id));
            }
          },
        ),
      );
    });
  });

  describe('arborescences', () => {
    const arbNetwork = arbGraph({ directed: true, weighted: true, minN: 1, maxN: 5 }).chain(
      (graph) => fc.tuple(fc.constant(graph), fc.nat(graph.vertexCount - 1)),
    );

    it('the minimum spanning arborescence has the exhaustive optimum and is a valid arborescence', () => {
      fc.assert(
        fc.property(arbNetwork, ([graph, index]) => {
          const root = graph.vertexAt(index);
          const found = minimumSpanningArborescence(graph, root);
          const wanted = cheapest(graph, index);

          expect(found?.totalWeight ?? Infinity).toBe(wanted);

          const targets = (found?.edges ?? []).map(({ target }) => target);

          expect(new Set(targets).size).toBe(targets.length);
          expect(targets).not.toContain(root);
          expect(targets).toHaveLength(found === undefined ? 0 : graph.vertexCount - 1);

          expect(
            found?.edges.every(({ source, target }) => graph.hasEdge(source, target)),
          ).not.toBe(false);
        }),
        BRUTE_FORCE,
      );
    });
  });

  describe('Steiner trees', () => {
    it('connects the terminals using graph edges, within a factor 2 of the exact optimum', () => {
      fc.assert(
        fc.property(
          arbGraph({ weighted: true, minN: 2, maxN: 6 }).chain((graph) =>
            fc.tuple(fc.constant(graph), fc.subarray(range(graph.vertexCount), { minLength: 1 })),
          ),
          ([graph, terminals]) => {
            const found = steinerTree(
              graph,
              terminals.map((index) => name(index)),
            );
            const best = optimum(graph, terminals);

            expect(found === undefined).toBe(best === Infinity);

            const edges = found?.edges ?? [];
            const weight = found?.totalWeight ?? best;
            const { acyclic } = components(graph.vertexCount, indexPairs(edges, graph));
            const touched = new Set(
              edges.flatMap(({ source, target }) => [graph.indexOf(source), graph.indexOf(target)]),
            );

            expect(acyclic).toBe(true);
            expect(weight).toBeGreaterThanOrEqual(best);
            expect(weight).toBeLessThanOrEqual(2 * best);
            expect(sum(edges.map((edge) => edge.weight))).toBe(found?.totalWeight ?? 0);

            expect(
              found === undefined ||
                terminals.length === 1 ||
                terminals.every((terminal) => touched.has(terminal)),
            ).toBe(true);

            expect(edges.every(({ source, target }) => graph.hasEdge(source, target))).toBe(true);
          },
        ),
        BRUTE_FORCE,
      );
    });

    it('is not affected by repeating terminals or by renaming vertices', () => {
      fc.assert(
        fc.property(
          arbGraph({ weighted: true, minN: 2, maxN: 6 }).chain((graph) =>
            fc.tuple(
              fc.constant(graph),
              fc.subarray(range(graph.vertexCount), { minLength: 1 }),
              arbPermutation(graph.vertexCount),
            ),
          ),
          ([graph, terminals, order]) => {
            const ids = terminals.map((index) => name(index));
            const once = steinerTree(graph, ids)?.totalWeight;
            const twice = steinerTree(graph, [...ids, ...ids])?.totalWeight;
            const moved = steinerTree(
              relabel(graph, order),
              terminals.map((index) => name(order[index]!)),
            )?.totalWeight;

            expect(twice).toBe(once);
            expect(moved === undefined).toBe(once === undefined);
          },
        ),
      );
    });
  });
});
