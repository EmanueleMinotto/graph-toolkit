import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-sdk/core';
import { completeGraph, cycleGraph, gridGraph, pathGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import { isPlanar } from './index.js';

const name = (index: number) => vertexId(String(index));

const fromPairs = (count: number, pairs: readonly (readonly [number, number])[]): Graph => {
  const builder = new GraphBuilder();
  for (let index = 0; index < count; index++) builder.addVertex(name(index));
  for (const [from, to] of pairs) builder.addEdge(name(from), name(to));
  return builder.build();
};

const bipartite33 = (): Graph =>
  fromPairs(
    6,
    [0, 1, 2].flatMap((left) => [3, 4, 5].map((right) => [left, right] as const)),
  );

const PETERSEN = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [4, 0],
  [0, 5],
  [1, 6],
  [2, 7],
  [3, 8],
  [4, 9],
  [5, 7],
  [7, 9],
  [9, 6],
  [6, 8],
  [8, 5],
] as const;

describe('isPlanar', () => {
  it('accepts planar graphs', () => {
    expect(isPlanar(pathGraph(0))).toBe(true);
    expect(isPlanar(pathGraph(6))).toBe(true);
    expect(isPlanar(cycleGraph(7))).toBe(true);
    expect(isPlanar(completeGraph(4))).toBe(true);
    expect(isPlanar(gridGraph(4, 4))).toBe(true);
  });

  it('rejects K5, K3,3 and the Petersen graph', () => {
    expect(isPlanar(completeGraph(5))).toBe(false);
    expect(isPlanar(completeGraph(6))).toBe(false);
    expect(isPlanar(bipartite33())).toBe(false);
    expect(isPlanar(fromPairs(10, PETERSEN))).toBe(false);
  });

  it('detects subdivided Kuratowski graphs and ignores attachments', () => {
    const subdividedK5 = fromPairs(6, [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
      [1, 2],
      [1, 3],
      [1, 4],
      [2, 3],
      [2, 4],
      [3, 5],
      [5, 4],
    ]);
    expect(isPlanar(subdividedK5)).toBe(false);
    const pendant = fromPairs(7, [
      [0, 1],
      [0, 2],
      [0, 3],
      [1, 2],
      [1, 3],
      [2, 3],
      [3, 4],
      [4, 5],
      [5, 6],
    ]);
    expect(isPlanar(pendant)).toBe(true);
  });

  it('works block by block', () => {
    const bowtie = fromPairs(5, [
      [0, 1],
      [1, 2],
      [2, 0],
      [2, 3],
      [3, 4],
      [4, 2],
    ]);
    expect(isPlanar(bowtie)).toBe(true);
    const k5 = completeGraph(5)
      .edges()
      .map((edge) => [Number(edge.source), Number(edge.target)] as const);
    const attached = fromPairs(6, [...k5, [4, 5]]);
    expect(isPlanar(attached)).toBe(false);
  });

  it('classifies every graph on five vertices (only K5 is non-planar)', () => {
    const slots = completeGraph(5)
      .edges()
      .map((edge) => [Number(edge.source), Number(edge.target)] as const);
    for (let mask = 0; mask < 1 << slots.length; mask++) {
      const chosen = slots.filter((_, bit) => (mask >> bit) & 1);
      expect(isPlanar(fromPairs(5, chosen))).toBe(chosen.length < slots.length);
    }
  });

  it('ignores self loops and rejects directed graphs', () => {
    const looped = new GraphBuilder().addVertex(name(0)).addEdge(name(0), name(0)).build();
    expect(isPlanar(looped)).toBe(true);
    expect(() => isPlanar(pathGraph(3, { directed: true }))).toThrow(GraphError);
  });
});
