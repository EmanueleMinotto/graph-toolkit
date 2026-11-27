import type { Graph, VertexId } from '@graph-sdk/core';
import {
  arbGraph,
  arbPermutation,
  BRUTE_FORCE,
  canonical,
  relabel,
  type GraphOptions,
} from '@graph-sdk/test-utils';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  areIsomorphic,
  cartesianProduct,
  complement,
  contractEdge,
  findGraphIsomorphism,
  graphEditDistance,
  inducedSubgraph,
  intersection,
  lineGraph,
  tensorProduct,
  transpose,
  union,
} from './index.js';

type Pair = readonly [number, number];

const arbPlain = (options: GraphOptions) =>
  fc.boolean().chain((directed) => arbGraph({ ...options, directed }));

/** Two graphs of the same kind. */
const arbSameKind = (options: GraphOptions) =>
  fc
    .boolean()
    .chain((directed) =>
      fc.tuple(arbGraph({ ...options, directed }), arbGraph({ ...options, directed })),
    );

const arbRenamed = (options: GraphOptions) =>
  arbPlain(options).chain((graph) =>
    arbPermutation(graph.vertexCount).map(
      (order) => [graph, relabel(graph, order), order] as const,
    ),
  );

const pairKey = (directed: boolean, [from, to]: Pair): string =>
  directed || from <= to ? `${String(from)}:${String(to)}` : `${String(to)}:${String(from)}`;

const edgeKeys = (graph: Graph): Set<string> =>
  new Set(
    graph
      .edges()
      .map(({ source, target }) =>
        pairKey(graph.directed, [graph.indexOf(source), graph.indexOf(target)]),
      ),
  );

const permutations = (items: readonly number[]): number[][] =>
  items.length === 0
    ? [[]]
    : items.flatMap((item) =>
        permutations(items.filter((other) => other !== item)).map((rest) => [item, ...rest]),
      );

/** Cheapest relabelling of `left` (padded with isolated vertices up to `size`) onto `right`: edges that differ. */
function fewestEdgeChanges(left: Graph, right: Graph, size: number): number {
  const wanted = edgeKeys(right);
  const moved = left
    .edges()
    .map(({ source, target }): Pair => [left.indexOf(source), left.indexOf(target)]);

  return Math.min(
    ...permutations(Array.from({ length: size }, (_, index) => index)).map((mapping) => {
      const image = new Set(
        moved.map(([from, to]) => pairKey(left.directed, [mapping[from]!, mapping[to]!])),
      );
      const shared = [...image].filter((key) => wanted.has(key)).length;

      return image.size + wanted.size - 2 * shared;
    }),
  );
}

const bruteIsomorphic = (left: Graph, right: Graph): boolean =>
  left.vertexCount === right.vertexCount &&
  edgeKeys(left).size === edgeKeys(right).size &&
  fewestEdgeChanges(left, right, left.vertexCount) === 0;

describe('operations properties', () => {
  describe('isomorphism', () => {
    it('agrees with trying every vertex permutation', () => {
      fc.assert(
        fc.property(arbSameKind({ maxN: 6, allowSelfLoops: true }), ([left, right]) => {
          expect(areIsomorphic(left, right)).toBe(bruteIsomorphic(left, right));
        }),
        BRUTE_FORCE,
      );
    });

    it('recognises a relabelled copy and returns an adjacency-preserving bijection', () => {
      fc.assert(
        fc.property(arbRenamed({ maxN: 7, allowSelfLoops: true }), ([graph, copy]) => {
          const mapping = findGraphIsomorphism(graph, copy);

          expect(mapping).toBeDefined();
          expect(new Set(mapping?.values()).size).toBe(graph.vertexCount);

          expect(
            graph
              .edges()
              .every(({ source, target }) =>
                copy.hasEdge(mapping!.get(source)!, mapping!.get(target)!),
              ),
          ).toBe(true);
        }),
        BRUTE_FORCE,
      );
    });
  });

  describe('graph edit distance', () => {
    const costs = fc.record({
      vertexCost: fc.integer({ min: 0, max: 3 }),
      edgeCost: fc.integer({ min: 0, max: 3 }),
    });

    it('equals the cheapest relabelling plus the vertices that must be added', () => {
      fc.assert(
        fc.property(arbSameKind({ maxN: 5 }), costs, ([left, right], options) => {
          const size = Math.max(left.vertexCount, right.vertexCount);
          const changes = fewestEdgeChanges(left, right, size);
          const expected =
            Math.abs(left.vertexCount - right.vertexCount) * options.vertexCost +
            changes * options.edgeCost;

          expect(graphEditDistance(left, right, options)).toBe(expected);
        }),
        BRUTE_FORCE,
      );
    });

    it('is symmetric, zero on renamed copies and zero only between isomorphic graphs', () => {
      fc.assert(
        fc.property(arbSameKind({ maxN: 5 }), ([left, right]) => {
          const distance = graphEditDistance(left, right);

          expect(graphEditDistance(right, left)).toBe(distance);
          expect(distance === 0).toBe(areIsomorphic(left, right));
          expect(graphEditDistance(left, left)).toBe(0);
        }),
      );
    });

    it('satisfies the triangle inequality', () => {
      fc.assert(
        fc.property(
          fc
            .boolean()
            .chain((directed) =>
              fc.tuple(
                arbGraph({ directed, maxN: 4 }),
                arbGraph({ directed, maxN: 4 }),
                arbGraph({ directed, maxN: 4 }),
              ),
            ),
          ([first, second, third]) => {
            expect(graphEditDistance(first, third)).toBeLessThanOrEqual(
              graphEditDistance(first, second) + graphEditDistance(second, third),
            );
          },
        ),
      );
    });

    it('is not changed by renaming vertices', () => {
      fc.assert(
        fc.property(arbRenamed({ maxN: 5 }), ([graph, copy]) => {
          expect(graphEditDistance(graph, copy)).toBe(0);
        }),
      );
    });
  });

  describe('set operations', () => {
    it('complement is an involution on loop-free graphs and partitions the vertex pairs', () => {
      fc.assert(
        fc.property(arbPlain({}), (graph) => {
          const count = graph.vertexCount;
          const pairs = Math.max(0, (count * (count - 1)) / (graph.directed ? 1 : 2));

          expect(graph.edgeCount + complement(graph).edgeCount).toBe(pairs);
          expect(canonical(complement(complement(graph)))).toEqual(canonical(graph));
        }),
      );
    });

    it('transpose is an involution', () => {
      fc.assert(
        fc.property(arbPlain({ weighted: true, allowSelfLoops: true }), (graph) => {
          expect(canonical(transpose(transpose(graph)))).toEqual(canonical(graph));
        }),
      );
    });

    it('transpose reverses every arc and keeps the weights', () => {
      fc.assert(
        fc.property(arbGraph({ directed: true, weighted: true, allowSelfLoops: true }), (graph) => {
          const reversed = transpose(graph);

          expect(reversed.edgeCount).toBe(graph.edgeCount);

          expect(
            graph
              .edges()
              .every(({ source, target, weight }) =>
                reversed.edgesBetween(target, source).some((edge) => edge.weight === weight),
              ),
          ).toBe(true);
        }),
      );
    });

    it('union and intersection behave like set union and intersection', () => {
      fc.assert(
        fc.property(arbSameKind({ weighted: true }), ([left, right]) => {
          const both = union(left, right);
          const common = intersection(left, right);
          const plain = (graph: Graph) =>
            canonical(graph).edges.map((edge) => edge.split(':', 1)[0]);

          expect(new Set(both.vertices())).toEqual(
            new Set([...left.vertices(), ...right.vertices()]),
          );

          expect(new Set(plain(both))).toEqual(new Set([...plain(left), ...plain(right)]));

          expect(new Set(plain(common))).toEqual(
            new Set(plain(left).filter((edge) => plain(right).includes(edge))),
          );

          expect(canonical(union(left, left))).toEqual(canonical(left));
          expect(canonical(intersection(left, left))).toEqual(canonical(left));
          expect(canonical(union(left, intersection(left, right)))).toEqual(canonical(left));
          expect(new Set(plain(union(right, left)))).toEqual(new Set(plain(both)));
        }),
      );
    });

    it('inducedSubgraph keeps exactly the edges inside the chosen vertices', () => {
      fc.assert(
        fc.property(
          arbPlain({ weighted: true, allowSelfLoops: true }).chain((graph) =>
            fc.tuple(fc.constant(graph), fc.subarray([...graph.vertices()])),
          ),
          ([graph, keep]) => {
            const sub = inducedSubgraph(graph, keep);
            const inside = graph
              .edges()
              .filter(({ source, target }) => keep.includes(source) && keep.includes(target));

            expect(sub.vertices()).toEqual(graph.vertices().filter((id) => keep.includes(id)));
            expect(sub.edgeCount).toBe(inside.length);

            expect(
              inside.every(({ source, target, weight }) =>
                sub.edgesBetween(source, target).some((edge) => edge.weight === weight),
              ),
            ).toBe(true);
          },
        ),
      );
    });
  });

  describe('structure', () => {
    it('lineGraph has one vertex per edge and the expected number of adjacencies', () => {
      fc.assert(
        fc.property(arbPlain({ maxN: 6 }), (graph) => {
          const line = lineGraph(graph);
          const inDegree = (id: string): number =>
            graph.edges().filter(({ target }) => target === id).length;
          const expected = graph
            .vertices()
            .reduce(
              (sum, id) =>
                sum +
                (graph.directed
                  ? inDegree(id) * graph.degree(id)
                  : (graph.degree(id) * (graph.degree(id) - 1)) / 2),
              0,
            );

          expect(line.vertexCount).toBe(graph.edgeCount);
          expect(line.edgeCount).toBe(expected);
        }),
      );
    });

    it('product sizes follow from the factor sizes', () => {
      fc.assert(
        fc.property(arbSameKind({ maxN: 4 }), ([left, right]) => {
          const cartesian = cartesianProduct(left, right);
          const tensor = tensorProduct(left, right);
          const factor = left.directed ? 1 : 2;

          expect(cartesian.vertexCount).toBe(left.vertexCount * right.vertexCount);

          expect(cartesian.edgeCount).toBe(
            left.edgeCount * right.vertexCount + right.edgeCount * left.vertexCount,
          );

          expect(tensor.vertexCount).toBe(left.vertexCount * right.vertexCount);
          expect(tensor.edgeCount).toBe(factor * left.edgeCount * right.edgeCount);
        }),
      );
    });

    it('contracting an edge merges its endpoints', () => {
      fc.assert(
        fc.property(
          arbGraph({ maxN: 7 })
            .filter((graph) => graph.edgeCount > 0)
            .chain((graph) => fc.tuple(fc.constant(graph), fc.constantFrom(...graph.edges()))),
          ([graph, { source, target }]) => {
            const contracted = contractEdge(graph, source, target);
            const around = (id: VertexId) => graph.neighbors(id).map((edge) => edge.target);
            const expected = new Set([...around(source), ...around(target)]);

            expected.delete(source);
            expected.delete(target);
            expect(contracted.hasVertex(target)).toBe(false);
            expect(contracted.vertexCount).toBe(graph.vertexCount - 1);

            expect(new Set(contracted.neighbors(source).map((edge) => edge.target))).toEqual(
              expected,
            );

            expect(contracted.edgeCount).toBeLessThan(graph.edgeCount);
          },
        ),
      );
    });

    it('operations commute with renaming vertices, up to isomorphism', () => {
      fc.assert(
        fc.property(arbRenamed({ maxN: 6 }), ([graph, copy]) => {
          expect(areIsomorphic(complement(graph), complement(copy))).toBe(true);
          expect(areIsomorphic(lineGraph(graph), lineGraph(copy))).toBe(true);
          expect(areIsomorphic(transpose(graph), transpose(copy))).toBe(true);

          expect(areIsomorphic(cartesianProduct(graph, graph), cartesianProduct(copy, graph))).toBe(
            true,
          );
        }),
      );
    });
  });
});
