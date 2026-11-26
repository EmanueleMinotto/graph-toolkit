import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { cycleGraph, pathGraph, starGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import { areIsomorphic, findGraphIsomorphism } from './index.js';

const name = (index: number) => vertexId(String(index));

const fromPairs = (
  count: number,
  pairs: readonly (readonly [number, number])[],
  directed = false,
): Graph => {
  const builder = new GraphBuilder({ directed });
  for (let index = 0; index < count; index++) {
    builder.addVertex(name(index));
  }
  for (const [from, to] of pairs) {
    builder.addEdge(name(from), name(to));
  }
  return builder.build();
};

describe('isomorphism', () => {
  it('finds relabelings', () => {
    const left = fromPairs(4, [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 0],
    ]);
    const right = fromPairs(4, [
      [2, 0],
      [0, 3],
      [3, 1],
      [1, 2],
    ]);
    const mapping = findGraphIsomorphism(left, right)!;
    expect(mapping.size).toBe(4);
    for (const edge of left.edges()) {
      expect(right.hasEdge(mapping.get(edge.source)!, mapping.get(edge.target)!)).toBe(true);
    }
  });

  it('separates look-alikes', () => {
    expect(areIsomorphic(pathGraph(4), starGraph(4))).toBe(false);
    const hexagon = cycleGraph(6);
    const twoTriangles = fromPairs(6, [
      [0, 1],
      [1, 2],
      [2, 0],
      [3, 4],
      [4, 5],
      [5, 3],
    ]);
    expect(areIsomorphic(hexagon, twoTriangles)).toBe(false);
    expect(areIsomorphic(cycleGraph(4), cycleGraph(5))).toBe(false);
    expect(areIsomorphic(pathGraph(3), pathGraph(3, { directed: true }))).toBe(false);
  });

  it('respects direction and loops', () => {
    const forward = fromPairs(
      3,
      [
        [0, 1],
        [1, 2],
        [2, 0],
      ],
      true,
    );
    const backward = fromPairs(
      3,
      [
        [1, 0],
        [2, 1],
        [0, 2],
      ],
      true,
    );
    expect(areIsomorphic(forward, backward)).toBe(true);
    const sink = fromPairs(
      3,
      [
        [0, 1],
        [2, 1],
        [1, 0],
      ],
      true,
    );
    expect(areIsomorphic(forward, sink)).toBe(false);
    expect(areIsomorphic(fromPairs(2, [[0, 0]]), fromPairs(2, [[0, 1]]))).toBe(false);
    expect(
      areIsomorphic(
        fromPairs(2, [
          [0, 0],
          [0, 1],
        ]),
        fromPairs(2, [
          [1, 1],
          [0, 1],
        ]),
      ),
    ).toBe(true);
  });
});

const aborted = (): { aborted: boolean; throwIfAborted: () => void } => ({
  aborted: true,
  throwIfAborted: () => {
    throw new Error('stop');
  },
});
const live = {
  aborted: false,
  throwIfAborted: () => {
    /* never aborted */
  },
};

describe('cancellation', () => {
  it('aborts the search', () => {
    const signal = aborted();
    expect(() => findGraphIsomorphism(cycleGraph(5), cycleGraph(5), { signal })).toThrow('stop');
    expect(() => areIsomorphic(cycleGraph(5), cycleGraph(5), { signal })).toThrow('stop');
    expect(areIsomorphic(cycleGraph(5), cycleGraph(5), { signal: live })).toBe(true);
  });
});
