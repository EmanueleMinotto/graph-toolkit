import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { cycleGraph, pathGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  areIsomorphic,
  contractEdge,
  graphEditDistance,
  lineGraph,
  tensorProduct,
  union,
} from './index.js';

const name = (index: number) => vertexId(String(index));

const build = (
  count: number,
  arcs: readonly (readonly [number, number])[],
  directed = false,
): Graph => {
  const builder = new GraphBuilder({ directed });

  for (let index = 0; index < count; index++) {
    builder.addVertex(name(index));
  }

  for (const [from, to] of arcs) {
    builder.addEdge(name(from), name(to));
  }

  return builder.build();
};

const weighted = (weight: number) =>
  new GraphBuilder()
    .addVertex(name(0))
    .addVertex(name(1))
    .addEdge(name(0), name(1), weight)
    .build();

describe('error messages', () => {
  it('names the missing edge to contract', () => {
    expect(() => contractEdge(pathGraph(3), name(0), name(2))).toThrow('No edge 0 — 2 to contract');
  });

  it('explains edit-distance misuse', () => {
    const directed = pathGraph(2, { directed: true });

    expect(() => graphEditDistance(pathGraph(2), directed)).toThrow(
      'graphs must be both directed or both undirected',
    );

    expect(() => graphEditDistance(pathGraph(2), pathGraph(2), { edgeCost: -1 })).toThrow(
      'costs must be finite and non-negative',
    );

    expect(() => graphEditDistance(pathGraph(2), pathGraph(5), { maxVertices: 3 })).toThrow(
      'graphEditDistance supports at most 3 vertices',
    );

    expect(() => graphEditDistance(pathGraph(5), pathGraph(2), { maxVertices: 3 })).toThrow(
      'at most 3 vertices',
    );
  });

  it('explains mixed graph kinds', () => {
    expect(() => union(pathGraph(2), pathGraph(2, { directed: true }))).toThrow(
      'Graphs must both be directed or not',
    );
  });
});

describe('structures', () => {
  it('multiplies weights in a tensor product', () => {
    const product = tensorProduct(weighted(2), weighted(3));

    expect(product.edges().map((edge) => edge.weight)).toEqual([6, 6]);
  });

  it('names line-graph vertices after their edge', () => {
    expect(lineGraph(pathGraph(3)).vertices()).toEqual(['0--1', '1--2']);
    expect(lineGraph(pathGraph(3, { directed: true })).vertices()).toEqual(['0->1', '1->2']);
  });
});

describe('isomorphism', () => {
  it('tells apart graphs of different kind, order or size', () => {
    expect(areIsomorphic(pathGraph(3), pathGraph(3, { directed: true }))).toBe(false);
    expect(areIsomorphic(pathGraph(3), pathGraph(4))).toBe(false);
    expect(areIsomorphic(pathGraph(3), cycleGraph(3))).toBe(false);
  });

  it('tells apart same-sized graphs by loops and arc direction', () => {
    const loopAtEnd = build(3, [
      [0, 1],
      [1, 2],
      [0, 0],
    ]);

    const loopInMiddle = build(3, [
      [0, 1],
      [1, 2],
      [1, 1],
    ]);

    expect(areIsomorphic(loopAtEnd, loopInMiddle)).toBe(false);
    expect(areIsomorphic(loopAtEnd, loopAtEnd)).toBe(true);

    const outStar = build(
      4,
      [
        [0, 1],
        [0, 2],
        [0, 3],
      ],
      true,
    );

    const inStar = build(
      4,
      [
        [1, 0],
        [2, 0],
        [3, 0],
      ],
      true,
    );

    expect(areIsomorphic(outStar, inStar)).toBe(false);
    expect(areIsomorphic(outStar, outStar)).toBe(true);
  });

  it('tells apart graphs with equal degree sequences', () => {
    const hexagon = cycleGraph(6);
    const twoTriangles = build(6, [
      [0, 1],
      [1, 2],
      [2, 0],
      [3, 4],
      [4, 5],
      [5, 3],
    ]);

    expect(areIsomorphic(hexagon, twoTriangles)).toBe(false);
  });
});
