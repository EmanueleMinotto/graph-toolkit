import type { Graph } from '@graph-sdk/core';
import { BRUTE_FORCE } from '@graph-sdk/test-utils';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  barabasiAlbertGraph,
  binaryTreeGraph,
  completeBipartiteGraph,
  completeGraph,
  cycleGraph,
  gridGraph,
  hypercubeGraph,
  pathGraph,
  petersenGraph,
  randomGraph,
  randomGraphWithEdges,
  starGraph,
  wattsStrogatzGraph,
  wheelGraph,
} from './index.js';

const size = fc.integer({ min: 0, max: 24 });
const seed = fc.integer({ min: 0, max: 2 ** 31 });
const byText = (left: string, right: string): number => left.localeCompare(right);

const degrees = (graph: Graph): number[] => graph.vertices().map((id) => graph.degree(id));
const choose2 = (n: number): number => Math.max(0, (n * (n - 1)) / 2);

/** Edge set as sorted "a-b" strings (undirected endpoints ordered), loops and repeats kept. */
const edgeSet = (graph: Graph): string[] =>
  graph
    .edges()
    .map(({ source, target }) => [source, target].toSorted(byText).join('-'))
    .toSorted(byText);

/** Undirected neighbour lists. */
function around(graph: Graph): Map<string, string[]> {
  const lists = new Map<string, string[]>(graph.vertices().map((id) => [id, []]));

  for (const { source, target } of graph.edges()) {
    lists.get(source)!.push(target);
    lists.get(target)!.push(source);
  }

  return lists;
}

/** Colours everything reachable from `start` alternately, level by level. */
function flood(start: string, lists: Map<string, string[]>, side: Map<string, number>): void {
  const queue: string[] = [start];

  side.set(start, 0);

  for (let current = queue.shift(); current !== undefined; current = queue.shift()) {
    const unseen = lists.get(current)!.filter((candidate) => !side.has(candidate));

    for (const next of unseen) {
      side.set(next, 1 - side.get(current)!);
      queue.push(next);
    }
  }
}

/** Number of components, and whether no edge joins two vertices of the same colour. */
function explore(graph: Graph): { components: number; bipartite: boolean } {
  const lists = around(graph);
  const side = new Map<string, number>();
  const starts = graph.vertices().filter((id) => {
    const fresh = !side.has(id);

    if (fresh) {
      flood(id, lists, side);
    }

    return fresh;
  });
  const bipartite = graph
    .edges()
    .every(({ source, target }) => side.get(source) !== side.get(target));

  return { components: starts.length, bipartite };
}

const isConnected = (graph: Graph): boolean => explore(graph).components <= 1;
const isBipartite = (graph: Graph): boolean => explore(graph).bipartite;

describe('generators properties', () => {
  describe('deterministic families', () => {
    it('have the textbook vertex and edge counts, directed or not', () => {
      fc.assert(
        fc.property(
          fc.record({
            n: size,
            rows: fc.integer({ min: 0, max: 6 }),
            columns: fc.integer({ min: 0, max: 6 }),
            directed: fc.boolean(),
          }),
          ({ n, rows, columns, directed }) => {
            const options = { directed };
            const counts: [Graph, number, number][] = [
              [pathGraph(n, options), n, Math.max(n - 1, 0)],
              [cycleGraph(n, options), n, n < 3 ? Math.max(n - 1, 0) : n],
              [completeGraph(n, options), n, choose2(n)],
              [starGraph(n, options), n, Math.max(n - 1, 0)],
              [binaryTreeGraph(n, options), n, Math.max(n - 1, 0)],
              [
                gridGraph(rows, columns, options),
                rows * columns,
                rows * Math.max(columns - 1, 0) + columns * Math.max(rows - 1, 0),
              ],
              [completeBipartiteGraph(rows, columns, options), rows + columns, rows * columns],
              [hypercubeGraph(rows, options), 2 ** rows, rows * 2 ** Math.max(rows - 1, 0)],
            ];

            for (const [graph, vertices, edges] of counts) {
              expect(graph.vertexCount).toBe(vertices);
              expect(graph.edgeCount).toBe(edges);
              expect(graph.directed).toBe(directed);
            }
          },
        ),
      );
    });

    it('have the textbook degree sequences', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 3, max: 24 }),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 6 }),
          (n, dimension, other) => {
            const hub = degrees(starGraph(n));
            const rim = degrees(wheelGraph(n + 1));

            expect(degrees(cycleGraph(n)).every((degree) => degree === 2)).toBe(true);
            expect(degrees(completeGraph(n)).every((degree) => degree === n - 1)).toBe(true);
            expect(hub).toEqual([n - 1, ...Array.from({ length: n - 1 }, () => 1)]);
            expect(rim).toEqual([n, ...Array.from({ length: n }, () => 3)]);

            expect(degrees(hypercubeGraph(dimension)).every((degree) => degree === dimension)).toBe(
              true,
            );

            expect(degrees(completeBipartiteGraph(n, other))).toEqual([
              ...Array.from({ length: n }, () => other),
              ...Array.from({ length: other }, () => n),
            ]);

            expect(degrees(petersenGraph()).every((degree) => degree === 3)).toBe(true);
          },
        ),
      );
    });

    it('trees are connected with n - 1 edges; cycles, grids and hypercubes are connected too', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 24 }),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          (n, rows, columns) => {
            for (const tree of [pathGraph(n), starGraph(n), binaryTreeGraph(n)]) {
              expect(isConnected(tree)).toBe(true);
              expect(tree.edgeCount).toBe(n - 1);
            }

            expect(isConnected(cycleGraph(n))).toBe(true);
            expect(isConnected(gridGraph(rows, columns))).toBe(true);
            expect(isConnected(hypercubeGraph(rows))).toBe(true);
            expect(isConnected(wheelGraph(n))).toBe(true);
          },
        ),
      );
    });

    it('binary trees are heap shaped and grids, hypercubes and complete bipartite graphs are bipartite', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 24 }),
          fc.integer({ min: 1, max: 5 }),
          fc.integer({ min: 1, max: 5 }),
          (n, rows, columns) => {
            const tree = binaryTreeGraph(n);

            for (const { source, target } of tree.edges()) {
              expect((Number(target) - 1) >> 1).toBe(Number(source));
            }

            expect(degrees(tree).every((degree) => degree <= 3)).toBe(true);
            expect(isBipartite(gridGraph(rows, columns))).toBe(true);
            expect(isBipartite(hypercubeGraph(rows))).toBe(true);
            expect(isBipartite(completeBipartiteGraph(rows, columns))).toBe(true);
          },
        ),
      );
    });

    it('directed and undirected variants share their edge endpoints', () => {
      fc.assert(
        fc.property(fc.integer({ min: 0, max: 12 }), (n) => {
          for (const make of [
            pathGraph,
            cycleGraph,
            completeGraph,
            starGraph,
            wheelGraph,
            binaryTreeGraph,
          ]) {
            expect(edgeSet(make(n, { directed: true }))).toEqual(edgeSet(make(n)));
          }
        }),
      );
    });
  });

  describe('random families', () => {
    it('are deterministic for a given seed and always simple graphs', () => {
      fc.assert(
        fc.property(
          fc.record({
            n: size,
            probability: fc.double({ min: 0, max: 1, noNaN: true }),
            value: seed,
            directed: fc.boolean(),
          }),
          ({ n, probability, value, directed }) => {
            const first = randomGraph(n, { probability, seed: value, directed });
            const again = randomGraph(n, { probability, seed: value, directed });
            const loops = first.edges().filter(({ source, target }) => source === target);

            expect(edgeSet(again)).toEqual(edgeSet(first));
            expect(loops).toHaveLength(0);
            expect(new Set(edgeSet(first)).size).toBe(first.edgeCount);
            expect(first.edgeCount).toBeLessThanOrEqual(choose2(n));
          },
        ),
        BRUTE_FORCE,
      );
    });

    it('G(n, p) is empty at p = 0 and complete at p = 1', () => {
      fc.assert(
        fc.property(size, seed, (n, value) => {
          expect(randomGraph(n, { probability: 0, seed: value }).edgeCount).toBe(0);

          expect(edgeSet(randomGraph(n, { probability: 1, seed: value }))).toEqual(
            edgeSet(completeGraph(n)),
          );
        }),
      );
    });

    it('G(n, m) has exactly min(m, C(n, 2)) distinct edges', () => {
      fc.assert(
        fc.property(size, fc.integer({ min: 0, max: 400 }), seed, (n, edges, value) => {
          const graph = randomGraphWithEdges(n, { edges, seed: value });

          expect(graph.edgeCount).toBe(Math.min(edges, choose2(n)));
          expect(new Set(edgeSet(graph)).size).toBe(graph.edgeCount);
          expect(edgeSet(randomGraphWithEdges(n, { edges, seed: value }))).toEqual(edgeSet(graph));
        }),
        BRUTE_FORCE,
      );
    });

    it('Barabási–Albert graphs have the expected size, are connected and give every vertex at least `attach` links', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 4 }),
          fc.integer({ min: 0, max: 30 }),
          seed,
          (attach, extra, value) => {
            const n = attach + 1 + extra;
            const graph = barabasiAlbertGraph(n, { attach, seed: value });

            expect(graph.edgeCount).toBe(choose2(attach + 1) + attach * extra);
            expect(isConnected(graph)).toBe(true);
            expect(degrees(graph).every((degree) => degree >= attach)).toBe(true);
          },
        ),
        BRUTE_FORCE,
      );
    });

    it('Watts–Strogatz rewiring keeps the edge count and never makes a loop or a repeated edge', () => {
      fc.assert(
        fc.property(
          fc.record({
            reach: fc.integer({ min: 1, max: 3 }),
            extra: fc.integer({ min: 1, max: 20 }),
            beta: fc.double({ min: 0, max: 1, noNaN: true }),
            value: seed,
          }),
          ({ reach, extra, beta, value }) => {
            const n = 2 * reach + extra;
            const graph = wattsStrogatzGraph(n, { neighbors: 2 * reach, beta, seed: value });
            const lattice = wattsStrogatzGraph(n, { neighbors: 2 * reach, beta: 0, seed: value });

            expect(graph.edgeCount).toBe(lattice.edgeCount);
            expect(graph.edgeCount).toBe(n * reach);
            expect(new Set(edgeSet(graph)).size).toBe(graph.edgeCount);
            expect(graph.edges().every(({ source, target }) => source !== target)).toBe(true);
            expect(degrees(lattice).every((degree) => degree === 2 * reach)).toBe(true);
          },
        ),
        BRUTE_FORCE,
      );
    });
  });
});
