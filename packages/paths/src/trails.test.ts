import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { completeGraph, cycleGraph, pathGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import { eulerianTrail, hamiltonianCycle, hamiltonianPath } from './index.js';

const name = (index: number) => vertexId(String(index));

const build = (
  count: number,
  arcs: readonly (readonly [number, number, number])[],
  directed = false,
): Graph => {
  const builder = new GraphBuilder({ directed });

  for (let index = 0; index < count; index++) {
    builder.addVertex(name(index));
  }

  for (const [from, to, weight] of arcs) {
    builder.addEdge(name(from), name(to), weight);
  }

  return builder.build();
};

describe('eulerianTrail', () => {
  it('finds circuits and open trails', () => {
    expect(eulerianTrail(cycleGraph(4))).toHaveLength(5);
    expect(eulerianTrail(pathGraph(4))).toHaveLength(4);
    const directed = build(
      3,
      [
        [0, 1, 1],
        [1, 2, 1],
        [2, 0, 1],
      ],
      true,
    );

    expect(eulerianTrail(directed)).toHaveLength(4);
    const open = build(
      3,
      [
        [0, 1, 1],
        [1, 2, 1],
      ],
      true,
    );

    expect(eulerianTrail(open)).toEqual([name(0), name(1), name(2)]);
  });

  it('rejects impossible graphs', () => {
    const doubled = build(
      3,
      [
        [0, 1, 1],
        [0, 2, 1],
        [1, 2, 1],
      ],
      true,
    );

    expect(eulerianTrail(doubled)).toBeUndefined();
    expect(eulerianTrail(completeGraph(4))).toBeUndefined();
    expect(eulerianTrail(build(3, []))).toBeUndefined();
    const twoCycles = build(6, [
      [0, 1, 1],
      [1, 2, 1],
      [2, 0, 1],
      [3, 4, 1],
      [4, 5, 1],
      [5, 3, 1],
    ]);

    expect(eulerianTrail(twoCycles)).toBeUndefined();
    const badDirected = build(
      3,
      [
        [0, 1, 1],
        [0, 2, 1],
      ],
      true,
    );

    expect(eulerianTrail(badDirected)).toBeUndefined();
    const skew = build(
      4,
      [
        [0, 1, 1],
        [0, 2, 1],
        [3, 1, 1],
      ],
      true,
    );

    expect(eulerianTrail(skew)).toBeUndefined();
  });
});

describe('hamiltonian', () => {
  it('finds paths and cycles', () => {
    expect(hamiltonianPath(pathGraph(5))).toHaveLength(5);
    expect(hamiltonianCycle(cycleGraph(5))).toHaveLength(5);
    expect(hamiltonianCycle(completeGraph(4))).toHaveLength(4);
  });

  it('reports absence', () => {
    expect(hamiltonianCycle(pathGraph(4))).toBeUndefined();
    expect(hamiltonianCycle(pathGraph(2))).toBeUndefined();
    expect(hamiltonianPath(build(3, [[0, 1, 1]]))).toBeUndefined();
    expect(hamiltonianPath(build(0, []))).toBeUndefined();
  });
});
