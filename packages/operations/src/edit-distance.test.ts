import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-sdk/core';
import {
  completeGraph,
  cycleGraph,
  pathGraph,
  randomGraph,
  starGraph,
} from '@graph-sdk/generators';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { graphEditDistance } from './index.js';

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

const random = (count: number, seed: number): Graph =>
  randomGraph(count, { probability: 0.5, seed });

describe('graphEditDistance', () => {
  it('is zero for isomorphic graphs whatever the vertex names', () => {
    const relabeled = build(3, [
      [2, 0],
      [0, 1],
    ]);

    expect(graphEditDistance(pathGraph(3), pathGraph(3))).toBe(0);
    expect(graphEditDistance(pathGraph(3), relabeled)).toBe(0);
    expect(graphEditDistance(build(0, []), build(0, []))).toBe(0);
  });

  it('counts edge and vertex insertions and deletions', () => {
    expect(graphEditDistance(pathGraph(3), cycleGraph(3))).toBe(1);
    expect(graphEditDistance(pathGraph(4), starGraph(4))).toBe(2);
    expect(graphEditDistance(build(3, []), completeGraph(3))).toBe(3);
    expect(graphEditDistance(completeGraph(2), completeGraph(4))).toBe(7);
    expect(graphEditDistance(build(0, []), pathGraph(3))).toBe(5);
  });

  it('weighs operations with the given costs', () => {
    const costs = { vertexCost: 2, edgeCost: 0.5 };

    expect(graphEditDistance(completeGraph(2), completeGraph(4), costs)).toBe(2 * 2 + 5 * 0.5);
    expect(graphEditDistance(pathGraph(3), cycleGraph(3), { edgeCost: 0 })).toBe(0);
  });

  it('handles loops and directed graphs', () => {
    expect(graphEditDistance(build(2, [[0, 0]]), build(2, []))).toBe(1);
    expect(graphEditDistance(build(2, [[0, 1]], true), build(2, [[1, 0]], true))).toBe(0);

    expect(
      graphEditDistance(
        build(
          3,
          [
            [0, 1],
            [1, 2],
          ],
          true,
        ),
        build(
          3,
          [
            [0, 1],
            [2, 1],
          ],
          true,
        ),
      ),
    ).toBe(2);
  });

  it('is a symmetric metric on random graphs', () => {
    fc.assert(
      fc.property(fc.tuple(fc.integer(), fc.integer(), fc.integer()), fc.nat(5), (seeds, size) => {
        const [first, second, third] = seeds.map((seed, index) => random(size + (index % 2), seed));
        const [ab, bc, ac] = [
          graphEditDistance(first!, second!),
          graphEditDistance(second!, third!),
          graphEditDistance(first!, third!),
        ];

        expect(graphEditDistance(second!, first!)).toBe(ab);
        expect(graphEditDistance(first!, first!)).toBe(0);
        expect(ac).toBeLessThanOrEqual(ab + bc);
      }),
    );
  });

  it('validates its input and honors cancellation', () => {
    expect(() => graphEditDistance(pathGraph(2), build(2, [], true))).toThrow(GraphError);

    expect(() => graphEditDistance(pathGraph(2), pathGraph(2), { edgeCost: -1 })).toThrow(
      GraphError,
    );

    expect(() => graphEditDistance(pathGraph(2), pathGraph(2), { vertexCost: Infinity })).toThrow(
      GraphError,
    );

    expect(() => graphEditDistance(pathGraph(9), pathGraph(9))).toThrow(GraphError);
    expect(graphEditDistance(pathGraph(9), pathGraph(9), { maxVertices: 9 })).toBe(0);

    const aborted = {
      aborted: true,
      throwIfAborted: () => {
        throw new Error('stopped');
      },
    };

    expect(() => graphEditDistance(pathGraph(3), cycleGraph(3), { signal: aborted })).toThrow(
      'stopped',
    );
  });
});
