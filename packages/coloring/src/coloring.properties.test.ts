import { GraphError, type Graph } from '@graph-sdk/core';
import {
  arbGraph,
  arbPermutation,
  BRUTE_FORCE,
  buildGraph,
  name,
  range,
  relabel,
} from '@graph-sdk/test-utils';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  bipartition,
  dsaturColoring,
  edgeColoring,
  exactColoring,
  greedyColoring,
  isProperColoring,
  type Coloring,
} from './index.js';

const arbSimple = arbGraph({ directed: false, maxN: 6 });
const maxDegree = (graph: Graph): number =>
  Math.max(0, ...graph.vertices().map((id) => graph.degree(id)));

/** Smallest number of colours for which some assignment of colours to vertices has no clashing edge. */
function chromaticNumber(graph: Graph): number {
  const pairs = graph
    .edges()
    .map(({ source, target }) => [graph.indexOf(source), graph.indexOf(target)] as const);
  const works = (colours: number): boolean =>
    Array.from({ length: colours ** graph.vertexCount }, (_, code) =>
      range(graph.vertexCount).map((vertex) => Math.floor(code / colours ** vertex) % colours),
    ).some((assignment) => pairs.every(([from, to]) => assignment[from] !== assignment[to]));

  return graph.vertexCount === 0
    ? 0
    : range(graph.vertexCount + 1).find((colours) => colours > 0 && works(colours))!;
}

/** What every vertex colouring must satisfy, stated without the library's own checker. */
function expectValid(graph: Graph, coloring: Coloring): void {
  const used = new Set(coloring.colors.values());

  expect(coloring.colors.size).toBe(graph.vertexCount);
  expect(coloring.colorCount).toBe(used.size);

  expect(
    [...used].every(
      (colour) => Number.isSafeInteger(colour) && colour >= 0 && colour < coloring.colorCount,
    ),
  ).toBe(true);

  expect(
    graph
      .edges()
      .every(({ source, target }) => coloring.colors.get(source) !== coloring.colors.get(target)),
  ).toBe(true);

  expect(isProperColoring(graph, coloring)).toBe(true);
}

describe('coloring properties', () => {
  it('greedy, DSATUR and exact colourings are proper and use consecutive colours; greedy and DSATUR stay within Δ + 1', () => {
    fc.assert(
      fc.property(arbSimple, (graph) => {
        for (const coloring of [
          greedyColoring(graph),
          dsaturColoring(graph),
          exactColoring(graph),
        ]) {
          expectValid(graph, coloring);
        }

        expect(greedyColoring(graph).colorCount).toBeLessThanOrEqual(maxDegree(graph) + 1);
        expect(dsaturColoring(graph).colorCount).toBeLessThanOrEqual(maxDegree(graph) + 1);
      }),
      BRUTE_FORCE,
    );
  });

  it('greedy colouring is proper and within Δ + 1 for every vertex order', () => {
    fc.assert(
      fc.property(
        arbSimple.chain((graph) => fc.tuple(fc.constant(graph), arbPermutation(graph.vertexCount))),
        ([graph, order]) => {
          const coloring = greedyColoring(
            graph,
            order.map((index) => name(index)),
          );

          expectValid(graph, coloring);
          expect(coloring.colorCount).toBeLessThanOrEqual(maxDegree(graph) + 1);
        },
      ),
    );
  });

  it('the exact colouring uses the chromatic number, never more than the heuristics and invariant under renaming', () => {
    fc.assert(
      fc.property(
        arbSimple.chain((graph) => fc.tuple(fc.constant(graph), arbPermutation(graph.vertexCount))),
        ([graph, order]) => {
          const exact = exactColoring(graph).colorCount;

          expect(exact).toBe(chromaticNumber(graph));
          expect(exact).toBeLessThanOrEqual(dsaturColoring(graph).colorCount);
          expect(exact).toBeLessThanOrEqual(greedyColoring(graph).colorCount);
          expect(exactColoring(relabel(graph, order)).colorCount).toBe(exact);
        },
      ),
      BRUTE_FORCE,
    );
  });

  it('DSATUR is exact on bipartite graphs and on cycles', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 4 }),
        fc.integer({ min: 1, max: 4 }),
        fc.integer({ min: 3, max: 9 }),
        (left, right, length) => {
          const cross = range(left).flatMap((from) =>
            range(right).map((to) => [from, left + to, 1] as const),
          );
          const bipartite = buildGraph(left + right, cross);
          const cycle = buildGraph(
            length,
            range(length).map((index) => [index, (index + 1) % length, 1] as const),
          );

          expect(dsaturColoring(bipartite).colorCount).toBe(2);
          expect(dsaturColoring(cycle).colorCount).toBe(length % 2 === 0 ? 2 : 3);
        },
      ),
    );
  });

  it('bipartition exists exactly when two colours suffice, and is then a proper 2-colouring', () => {
    fc.assert(
      fc.property(arbSimple, (graph) => {
        const two = bipartition(graph);
        const possible = chromaticNumber(graph) <= 2;

        expect(two !== undefined).toBe(possible);

        expect(two === undefined || (two.colorCount <= 2 && isProperColoring(graph, two))).toBe(
          true,
        );

        expect(two === undefined || two.colors.size === graph.vertexCount).toBe(true);
      }),
      BRUTE_FORCE,
    );
  });

  it('edge colouring is proper, covers every edge and uses between Δ and 2Δ − 1 colours', () => {
    fc.assert(
      fc.property(arbSimple, (graph) => {
        const colouring = edgeColoring(graph);
        const delta = maxDegree(graph);
        const colourAt = (vertex: string): number[] =>
          colouring.edges
            .filter(({ source, target }) => source === vertex || target === vertex)
            .map(({ color }) => color);

        expect(colouring.edges).toHaveLength(graph.edgeCount);
        expect(colouring.colorCount).toBe(new Set(colouring.edges.map(({ color }) => color)).size);
        expect(colouring.colorCount).toBeGreaterThanOrEqual(delta);
        expect(colouring.colorCount).toBeLessThanOrEqual(Math.max(2 * delta - 1, 0));

        for (const vertex of graph.vertices()) {
          expect(new Set(colourAt(vertex)).size).toBe(colourAt(vertex).length);
        }
      }),
    );
  });

  it('directed graphs and self-loops are rejected by the greedy colouring', () => {
    fc.assert(
      fc.property(
        arbGraph({ directed: true, minN: 1, maxN: 4 }),
        fc.integer({ min: 0, max: 3 }),
        (directed, vertex) => {
          const loop = buildGraph(4, [[vertex, vertex, 1]], { allowSelfLoops: true });

          expect(() => greedyColoring(directed)).toThrow(GraphError);
          expect(() => greedyColoring(loop)).toThrow(GraphError);
        },
      ),
    );
  });
});
