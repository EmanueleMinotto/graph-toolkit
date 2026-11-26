import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-sdk/core';
import {
  binaryTreeGraph,
  completeBipartiteGraph,
  completeGraph,
  cycleGraph,
  gridGraph,
  pathGraph,
  petersenGraph,
  randomGraph,
  wheelGraph,
} from '@graph-sdk/generators';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { kCores, treewidth, treewidthUpperBound } from './index.js';

const name = (index: number) => vertexId(String(index));

const build = (count: number, arcs: readonly (readonly [number, number])[], directed = false) => {
  const builder = new GraphBuilder({ directed });

  for (let index = 0; index < count; index++) {
    builder.addVertex(name(index));
  }

  for (const [from, to] of arcs) {
    builder.addEdge(name(from), name(to));
  }

  return builder.build();
};

const degeneracy = (graph: Graph): number => Math.max(0, ...kCores(graph).values());

describe('treewidth', () => {
  it('matches the known values of classic graphs', () => {
    expect(treewidth(pathGraph(7))).toBe(1);
    expect(treewidth(binaryTreeGraph(3))).toBe(1);
    expect(treewidth(cycleGraph(6))).toBe(2);
    expect(treewidth(completeGraph(6))).toBe(5);
    expect(treewidth(completeBipartiteGraph(3, 3))).toBe(3);
    expect(treewidth(wheelGraph(6))).toBe(3);
    expect(treewidth(gridGraph(3, 3))).toBe(3);
    expect(treewidth(petersenGraph())).toBe(4);
  });

  it('is 0 without edges and for the empty graph, and the widest component otherwise', () => {
    expect(treewidth(build(0, []))).toBe(0);
    expect(treewidth(build(4, []))).toBe(0);

    expect(
      treewidth(
        build(7, [
          [0, 1],
          [1, 2],
          [2, 0],
          [3, 4],
          [5, 6],
        ]),
      ),
    ).toBe(2);
  });

  it('ignores direction and loops', () => {
    expect(
      treewidth(
        build(
          3,
          [
            [0, 1],
            [1, 2],
            [2, 0],
            [0, 0],
          ],
          true,
        ),
      ),
    ).toBe(2);
  });

  it('sits between degeneracy and the min-degree upper bound on random graphs', () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 11 }), fc.integer(), (count, seed) => {
        const graph = randomGraph(count, { probability: 0.35, seed });
        const exact = treewidth(graph);

        expect(exact).toBeGreaterThanOrEqual(degeneracy(graph));
        expect(exact).toBeLessThanOrEqual(treewidthUpperBound(graph));
      }),
    );
  });

  it('rejects components that are too large and honors cancellation', () => {
    expect(() => treewidth(pathGraph(17))).toThrow(GraphError);
    expect(() => treewidth(pathGraph(5), { maxVertices: 4 })).toThrow(GraphError);
    expect(() => treewidth(pathGraph(5), { maxVertices: 99 })).toThrow(GraphError);
    expect(treewidth(pathGraph(17), { maxVertices: 20 })).toBe(1);

    const aborted = {
      aborted: true,
      throwIfAborted: () => {
        throw new Error('stopped');
      },
    };

    expect(() => treewidth(cycleGraph(5), { signal: aborted })).toThrow('stopped');
    // the 17-vertex exact run takes ~5s on slow CI runners
  }, 30_000);
});
