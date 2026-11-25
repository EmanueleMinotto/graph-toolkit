import { GraphBuilder, GraphError, vertexId } from '@graph-toolkit/core';
import { completeGraph, cycleGraph, gridGraph, randomGraph } from '@graph-toolkit/generators';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { bipartition, dsaturColoring, greedyColoring, isProperColoring } from './index.js';

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
