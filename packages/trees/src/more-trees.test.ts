import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-sdk/core';
import { cycleGraph, gridGraph, pathGraph, starGraph } from '@graph-sdk/generators';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  boruvkaMinimumSpanningForest,
  minimumSpanningForest,
  primMinimumSpanningForest,
  pruferCode,
  RootedTree,
  treeFromPruferCode,
} from './index.js';

const name = (index: number) => vertexId(String(index));

const weighted = (count: number, arcs: readonly (readonly [number, number, number])[]): Graph => {
  const builder = new GraphBuilder();
  for (let index = 0; index < count; index++) {
    builder.addVertex(name(index));
  }
  for (const [from, to, weight] of arcs) {
    builder.addEdge(name(from), name(to), weight);
  }
  return builder.build();
};

describe('Prim and Borůvka', () => {
  it('agree with Kruskal on random weighted graphs, including disconnected ones', () => {
    const arcs = fc.uniqueArray(fc.tuple(fc.nat(6), fc.nat(6), fc.integer({ min: 1, max: 20 })), {
      selector: ([a, b]) => `${Math.min(a, b)}:${Math.max(a, b)}`,
    });
    fc.assert(
      fc.property(arcs, (list) => {
        const graph = weighted(7, list);
        const expected = minimumSpanningForest(graph).totalWeight;
        expect(primMinimumSpanningForest(graph).totalWeight).toBe(expected);
        expect(boruvkaMinimumSpanningForest(graph).totalWeight).toBe(expected);
      }),
    );
  });

  it('rejects directed graphs', () => {
    const directed = new GraphBuilder({ directed: true }).build();
    expect(() => primMinimumSpanningForest(directed)).toThrow(GraphError);
    expect(() => boruvkaMinimumSpanningForest(directed)).toThrow(GraphError);
  });

  it('returns edges with vertex ids', () => {
    const forest = primMinimumSpanningForest(
      weighted(3, [
        [0, 1, 2],
        [1, 2, 3],
        [0, 2, 9],
      ]),
    );
    expect(forest.totalWeight).toBe(5);
    expect(forest.edges.map((edge) => edge.target)).toEqual([name(1), name(2)]);
  });
});

describe('RootedTree', () => {
  const tree = weighted(7, [
    [0, 1, 1],
    [0, 2, 1],
    [1, 3, 1],
    [1, 4, 1],
    [2, 5, 1],
    [5, 6, 1],
  ]);
  const rooted = new RootedTree(tree, name(0));

  it('exposes parents, depths and children', () => {
    expect(rooted.parentOf(name(0))).toBeUndefined();
    expect(rooted.parentOf(name(4))).toBe(name(1));
    expect(rooted.depthOf(name(6))).toBe(3);
    expect(rooted.childrenOf(name(1))).toEqual([name(3), name(4)]);
  });

  it('answers LCA queries', () => {
    expect(rooted.lowestCommonAncestor(name(3), name(4))).toBe(name(1));
    expect(rooted.lowestCommonAncestor(name(3), name(6))).toBe(name(0));
    expect(rooted.lowestCommonAncestor(name(6), name(5))).toBe(name(5));
    expect(rooted.lowestCommonAncestor(name(2), name(2))).toBe(name(2));
    expect(new RootedTree(pathGraph(1), name(0)).depthOf(name(0))).toBe(0);
  });

  it('requires an undirected tree', () => {
    expect(() => new RootedTree(cycleGraph(4), name(0))).toThrow(GraphError);
    expect(() => new RootedTree(pathGraph(3, { directed: true }), name(0))).toThrow(GraphError);
  });
});

describe('Prüfer codes', () => {
  it('encodes known trees', () => {
    expect(pruferCode(starGraph(5))).toEqual([name(0), name(0), name(0)]);
    expect(pruferCode(pathGraph(2))).toEqual([]);
  });

  it('round trips random sequences', () => {
    fc.assert(
      fc.property(fc.array(fc.nat(7), { minLength: 0, maxLength: 6 }), (raw) => {
        const vertices = Array.from({ length: raw.length + 2 }, (_, index) => name(index));
        const code = raw.map((value) => name(value % vertices.length));
        const tree = treeFromPruferCode(vertices, code);
        expect(tree.edgeCount).toBe(vertices.length - 1);
        expect(pruferCode(tree)).toEqual(code);
      }),
    );
  });

  it('validates input', () => {
    expect(() => pruferCode(cycleGraph(4))).toThrow(GraphError);
    expect(() => pruferCode(pathGraph(1))).toThrow(GraphError);
    expect(() => pruferCode(pathGraph(3, { directed: true }))).toThrow(GraphError);
    expect(() => treeFromPruferCode([name(0), name(1)], [name(0)])).toThrow(GraphError);
    expect(() => treeFromPruferCode([name(0), name(1), name(2)], [name(9)])).toThrow(GraphError);
    expect(gridGraph(1, 3).vertexCount).toBe(3);
  });
});
