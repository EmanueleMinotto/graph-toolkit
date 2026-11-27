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

const build = (ids: string[], edges: [string, string][]) => {
  const builder = new GraphBuilder();

  for (const id of ids) {
    builder.addVertex(vertexId(id));
  }

  for (const [from, to] of edges) {
    builder.addEdge(vertexId(from), vertexId(to));
  }

  return builder.build();
};

describe('mutation-hardening', () => {
  it('explains why a graph cannot be colored, in every entry point', () => {
    const directed = completeGraph(3, { directed: true });
    const loop = build(['a'], [['a', 'a']]);

    for (const color of [
      greedyColoring,
      dsaturColoring,
      bipartition,
      exactColoring,
      edgeColoring,
    ]) {
      expect(() => color(directed)).toThrow('Coloring requires an undirected graph');
      expect(() => color(loop)).toThrow('A graph with self-loops has no proper coloring');
    }
  });

  it('flags an improper coloring', () => {
    const graph = completeGraph(3);
    const same = new Map(graph.vertices().map((id) => [id, 0] as const));

    expect(isProperColoring(graph, { colors: same, colorCount: 1 })).toBe(false);
  });

  it('colors the highest-degree vertex first by default (Welsh–Powell)', () => {
    const star = build(
      ['l1', 'l2', 'hub', 'l3', 'l4'],
      [
        ['hub', 'l1'],
        ['hub', 'l2'],
        ['hub', 'l3'],
        ['hub', 'l4'],
      ],
    );
    const { colors, colorCount } = greedyColoring(star);

    expect(colors.get(vertexId('hub'))).toBe(0);
    expect(colorCount).toBe(2);
  });

  it('does not count uncolored neighbours as used colors', () => {
    const path = build(
      ['a', 'b', 'c'],
      [
        ['a', 'b'],
        ['b', 'c'],
      ],
    );

    expect(greedyColoring(path, path.vertices()).colorCount).toBe(2);
    expect(dsaturColoring(path).colorCount).toBe(2);
  });

  it('colors isolated vertices with color 0', () => {
    const lonely = build(['a', 'b', 'c'], []);

    for (const coloring of [
      dsaturColoring(lonely),
      greedyColoring(lonely),
      exactColoring(lonely),
    ]) {
      expect([...coloring.colors.values()]).toEqual([0, 0, 0]);
      expect(coloring.colorCount).toBe(1);
    }
  });

  it('dsatur two-colors a crown graph that defeats the natural greedy order', () => {
    const crown = build(
      ['a1', 'b1', 'a2', 'b2', 'a3', 'b3'],
      [
        ['a1', 'b2'],
        ['a1', 'b3'],
        ['a2', 'b1'],
        ['a2', 'b3'],
        ['a3', 'b1'],
        ['a3', 'b2'],
      ],
    );

    expect(greedyColoring(crown, crown.vertices()).colorCount).toBe(3);
    expect(dsaturColoring(crown).colorCount).toBe(2);
    expect(exactColoring(crown).colorCount).toBe(2);
  });

  it('bipartition keeps every component, isolated vertices included', () => {
    const graph = build(
      ['a', 'b', 'c', 'd', 'e'],
      [
        ['a', 'b'],
        ['c', 'd'],
      ],
    );
    const parts = bipartition(graph)!;

    expect(parts.colors.size).toBe(5);
    expect(parts.colors.get(vertexId('a'))).not.toBe(parts.colors.get(vertexId('b')));
    expect(parts.colors.get(vertexId('c'))).not.toBe(parts.colors.get(vertexId('d')));
    expect(parts.colors.get(vertexId('e'))).toBe(0);
  });

  it('counts edge colors exactly', () => {
    const single = build(['a', 'b'], [['a', 'b']]);
    const triangle = completeGraph(3);
    const noEdges = build(['a', 'b'], []);

    expect(edgeColoring(single).colorCount).toBe(1);
    expect(edgeColoring(triangle).colorCount).toBe(3);
    expect(edgeColoring(noEdges)).toEqual({ edges: [], colorCount: 0 });
  });
});
