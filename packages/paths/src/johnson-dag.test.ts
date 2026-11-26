import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-sdk/core';
import { cycleGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  dagShortestPaths,
  floydWarshall,
  hamiltonianCycle,
  hamiltonianPath,
  johnson,
  NegativeCycleError,
} from './index.js';

const v = (index: number) => vertexId(String(index));

function directed(count: number, arcs: readonly (readonly [number, number, number])[]): Graph {
  const builder = new GraphBuilder({ directed: true });

  for (let index = 0; index < count; index++) {
    builder.addVertex(v(index));
  }

  for (const [from, to, weight] of arcs) {
    builder.addEdge(v(from), v(to), weight);
  }

  return builder.build();
}

const negative = directed(5, [
  [0, 1, 3],
  [0, 2, 8],
  [1, 2, -2],
  [2, 3, 2],
  [3, 1, 4],
  [1, 4, 7],
]);

describe('johnson', () => {
  it('matches Floyd-Warshall, including negative weights and unreachable pairs', () => {
    const fast = johnson(negative);
    const slow = floydWarshall(negative);

    for (const from of negative.vertices()) {
      for (const to of negative.vertices()) {
        expect(fast.distance(from, to)).toBeCloseTo(slow.distance(from, to));
      }
    }

    expect(fast.distance(v(4), v(0))).toBe(Infinity);
  });

  it('throws on a negative cycle and handles the empty graph', () => {
    const bad = directed(2, [
      [0, 1, -1],
      [1, 0, -1],
    ]);

    expect(() => johnson(bad)).toThrow(NegativeCycleError);
    expect(() => johnson(directed(0, []))).not.toThrow();
  });
});

describe('dagShortestPaths', () => {
  const dag = directed(4, [
    [0, 1, 2],
    [0, 2, 6],
    [1, 2, -3],
    [2, 3, 1],
    [0, 3, 0],
  ]);

  it('handles negative weights and returns paths', () => {
    const tree = dagShortestPaths(dag, v(0));

    expect(tree.distanceTo(v(3))).toBe(0);
    expect(tree.pathTo(v(3))).toEqual([v(0), v(3)]);
  });

  it('skips vertices that precede the source', () => {
    expect(dagShortestPaths(dag, v(1)).distanceTo(v(0))).toBe(Infinity);
  });

  it('rejects cyclic and undirected graphs', () => {
    expect(() =>
      dagShortestPaths(
        directed(2, [
          [0, 1, 1],
          [1, 0, 1],
        ]),
        v(0),
      ),
    ).toThrow(GraphError);

    expect(() => dagShortestPaths(cycleGraph(3), v(0))).toThrow(GraphError);
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
  it('aborts the Hamiltonian search', () => {
    const signal = aborted();

    expect(() => hamiltonianPath(cycleGraph(5), { signal })).toThrow('stop');
    expect(() => hamiltonianCycle(cycleGraph(5), { signal })).toThrow('stop');
    expect(hamiltonianCycle(cycleGraph(5), { signal: live })).toHaveLength(5);
  });
});
