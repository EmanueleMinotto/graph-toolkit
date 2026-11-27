import { vertexId, type Graph } from '@graph-sdk/core';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  arbConnectedGraph,
  arbDag,
  arbGraph,
  arbPermutation,
  arbTree,
  relabel,
  UNDER_STRYKER,
} from './index.js';

/** Vertices reachable from the first one, ignoring arc direction. */
const reachable = (graph: Graph): number => {
  const [first] = graph.vertices();
  const seen = new Set<string>(first === undefined ? [] : [first]);
  let size = -1;

  while (size < seen.size) {
    ({ size } = seen);

    const touching = graph.edges().filter((edge) => seen.has(edge.source) || seen.has(edge.target));

    for (const { source, target } of touching) {
      seen.add(source);
      seen.add(target);
    }
  }

  return seen.size;
};

/** Targets whose in-degree drops to zero once `id` is removed. */
const release = (graph: Graph, id: string, indegree: Map<string, number>): string[] =>
  graph
    .neighbors(vertexId(id))
    .map(({ target }) => {
      indegree.set(target, (indegree.get(target) ?? 0) - 1);

      return target;
    })
    .filter((target) => indegree.get(target) === 0);

/** Kahn's algorithm: a cycle leaves vertices unprocessed. */
const hasCycle = (graph: Graph): boolean => {
  const indegree = new Map<string, number>(graph.vertices().map((id) => [id, 0]));

  for (const { target } of graph.edges()) {
    indegree.set(target, (indegree.get(target) ?? 0) + 1);
  }

  const ready: string[] = graph.vertices().filter((id) => indegree.get(id) === 0);
  let processed = 0;

  for (let id = ready.pop(); id !== undefined; id = ready.pop()) {
    processed += 1;

    ready.push(...release(graph, id, indegree));
  }

  return processed < graph.vertexCount;
};

describe('arbitraries', () => {
  it('arbGraph honours its options', () => {
    fc.assert(
      fc.property(arbGraph({ directed: true, weighted: true, maxN: 5 }), (graph) => {
        expect(graph.directed).toBe(true);
        expect(graph.vertexCount).toBeLessThanOrEqual(5);
        expect(graph.edges().every((edge) => edge.weight >= 1 && edge.weight <= 9)).toBe(true);
        expect(graph.edges().every((edge) => edge.source !== edge.target)).toBe(true);
      }),
    );
  });

  it('arbGraph can produce self-loops and parallel edges when allowed', () => {
    const seen = { loop: false, parallel: false };

    fc.assert(
      fc.property(arbGraph({ allowSelfLoops: true, allowParallelEdges: true }), (graph) => {
        const keys = graph
          .edges()
          .map((edge) =>
            [edge.source, edge.target].toSorted((a, b) => a.localeCompare(b)).join('-'),
          );

        seen.loop ||= graph.edges().some((edge) => edge.source === edge.target);
        seen.parallel ||= new Set(keys).size < keys.length;
      }),
      { numRuns: 300 },
    );

    expect(seen).toEqual({ loop: true, parallel: true });
  });

  it('arbConnectedGraph is connected', () => {
    fc.assert(
      fc.property(arbConnectedGraph({ directed: true }), (graph) => {
        expect(graph.vertexCount).toBeGreaterThanOrEqual(1);
        expect(reachable(graph)).toBe(graph.vertexCount);
      }),
    );
  });

  it('arbDag is acyclic', () => {
    fc.assert(
      fc.property(arbDag({ weighted: true }), (graph) => {
        expect(hasCycle(graph)).toBe(false);
      }),
    );
  });

  it('arbTree has n - 1 edges and is connected', () => {
    fc.assert(
      fc.property(arbTree(), (graph) => {
        expect(graph.edgeCount).toBe(graph.vertexCount - 1);
        expect(reachable(graph)).toBe(graph.vertexCount);
      }),
    );
  });

  it('arbPermutation is a permutation and relabel preserves the shape', () => {
    fc.assert(
      fc.property(
        arbGraph({ directed: true }).chain((graph) =>
          arbPermutation(graph.vertexCount).map((order) => [graph, order] as const),
        ),
        ([graph, order]) => {
          expect(order.toSorted((a, b) => a - b)).toEqual(order.map((_, index) => index));
          expect(relabel(graph, order).edgeCount).toBe(graph.edgeCount);
        },
      ),
    );
  });
});

describe('global fast-check setup', () => {
  it('reports seed and path of a failing property', () => {
    const failing = fc.property(fc.integer(), (n) => n < 1000);

    expect(() => {
      fc.assert(failing);
    }).toThrow(/Reproduce with fc\.assert\(property, \{ seed: -?\d+, path: "[\d:]+" \}\)/u);
  });

  it('uses the default run count', () => {
    let runs = 0;

    fc.assert(
      fc.property(fc.integer(), () => {
        runs += 1;
      }),
    );

    expect(runs).toBe(UNDER_STRYKER ? 20 : 100);
  });
});
