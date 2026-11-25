import { GraphBuilder, GraphError, vertexId } from '@graph-sdk/core';
import { completeGraph, cycleGraph, gridGraph, randomGraph } from '@graph-sdk/generators';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  bipartition,
  dsaturColoring,
  edgeColoring,
  exactColoring,
  greedyColoring,
  isProperColoring,
} from './index.js';

describe('coloring', () => {
  it('colors complete graphs with n colors', () => {
    expect(greedyColoring(completeGraph(5)).colorCount).toBe(5);
    expect(dsaturColoring(completeGraph(5)).colorCount).toBe(5);
  });

  it('honours a custom greedy order', () => {
    const graph = cycleGraph(4);
    const order = graph.vertices().toReversed();
    expect(isProperColoring(graph, greedyColoring(graph, order))).toBe(true);
  });

  it('dsatur is optimal on even cycles and odd cycles need 3', () => {
    expect(dsaturColoring(cycleGraph(6)).colorCount).toBe(2);
    expect(dsaturColoring(cycleGraph(5)).colorCount).toBe(3);
    expect(dsaturColoring(new GraphBuilder().build()).colorCount).toBe(0);
  });

  it('bipartition succeeds on grids and fails on odd cycles', () => {
    const grid = gridGraph(3, 3);
    const parts = bipartition(grid)!;
    expect(parts.colorCount).toBe(2);
    expect(isProperColoring(grid, parts)).toBe(true);
    expect(bipartition(cycleGraph(5))).toBeUndefined();
  });

  it('rejects directed graphs and self-loops', () => {
    expect(() => greedyColoring(completeGraph(3, { directed: true }))).toThrow(GraphError);
    const loop = new GraphBuilder().addVertex(vertexId('a')).addEdge(vertexId('a'), vertexId('a'));
    expect(() => dsaturColoring(loop.build())).toThrow(GraphError);
  });

  it('always produces proper colorings within Δ+1 colors on random graphs', () => {
    fc.assert(
      fc.property(fc.nat(1000), fc.double({ min: 0, max: 1, noNaN: true }), (seed, probability) => {
        const graph = randomGraph(12, { probability, seed });
        const maxDegree = Math.max(0, ...graph.vertices().map((id) => graph.degree(id)));
        for (const coloring of [greedyColoring(graph), dsaturColoring(graph)]) {
          expect(isProperColoring(graph, coloring)).toBe(true);
          expect(coloring.colorCount).toBeLessThanOrEqual(maxDegree + 1);
        }
      }),
    );
  });
});

describe('exactColoring', () => {
  it('finds chromatic numbers', () => {
    expect(exactColoring(completeGraph(5)).colorCount).toBe(5);
    expect(exactColoring(cycleGraph(5)).colorCount).toBe(3);
    expect(exactColoring(cycleGraph(6)).colorCount).toBe(2);
    expect(exactColoring(new GraphBuilder().build()).colorCount).toBe(0);
  });

  it('is never worse than DSATUR and always proper', () => {
    fc.assert(
      fc.property(fc.nat(500), (seed) => {
        const graph = randomGraph(8, { probability: 0.5, seed });
        const exact = exactColoring(graph);
        expect(isProperColoring(graph, exact)).toBe(true);
        expect(exact.colorCount).toBeLessThanOrEqual(dsaturColoring(graph).colorCount);
      }),
    );
  });
});

describe('edgeColoring', () => {
  it('never reuses a color at a vertex and stays within 2Δ − 1', () => {
    const graph = completeGraph(5);
    const result = edgeColoring(graph);
    const seen = result.edges.flatMap((edge) => [
      `${edge.source}:${edge.color}`,
      `${edge.target}:${edge.color}`,
    ]);
    expect(new Set(seen).size).toBe(seen.length);
    expect(result.colorCount).toBeLessThanOrEqual(2 * 4 - 1);
    expect(edgeColoring(new GraphBuilder().build())).toEqual({ edges: [], colorCount: 0 });
  });
});
