import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-sdk/core';
import { cycleGraph, gridGraph, pathGraph, starGraph } from '@graph-sdk/generators';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { maxFlow, maxFlowDinic, maximumBipartiteMatching } from './index.js';

const name = (index: number) => vertexId(String(index));

const NETWORK_SIZE = 6;

const network = (arcs: readonly (readonly [number, number, number])[]): Graph => {
  const builder = new GraphBuilder({ directed: true });
  for (let index = 0; index < NETWORK_SIZE; index++) builder.addVertex(name(index));
  for (const [from, to, capacity] of arcs) builder.addEdge(name(from), name(to), capacity);
  return builder.build();
};

describe('maxFlowDinic', () => {
  it('agrees with Edmonds–Karp on random networks', () => {
    const arcs = fc.uniqueArray(fc.tuple(fc.nat(5), fc.nat(5), fc.integer({ min: 0, max: 9 })), {
      selector: ([from, to]) => `${from}:${to}`,
    });
    fc.assert(
      fc.property(arcs, (list) => {
        const graph = network(list.filter(([from, to]) => from !== to));
        expect(maxFlowDinic(graph, name(0), name(5))).toBe(maxFlow(graph, name(0), name(5)));
      }),
    );
  });

  it('solves the CLRS network and validates input', () => {
    const graph = network([
      [0, 1, 16],
      [0, 2, 13],
      [1, 2, 10],
      [2, 1, 4],
      [1, 3, 12],
      [3, 2, 9],
      [2, 4, 14],
      [4, 3, 7],
      [3, 5, 20],
      [4, 5, 4],
    ]);
    expect(maxFlowDinic(graph, name(0), name(5))).toBe(23);
    expect(() => maxFlowDinic(graph, name(0), name(0))).toThrow(GraphError);
  });
});

describe('matching', () => {
  it('matches a perfect bipartite graph', () => {
    const matching = maximumBipartiteMatching(gridGraph(2, 3));
    expect(matching.size).toBe(3);
    expect(matching.pairs).toHaveLength(3);
  });

  it('re-routes earlier matches along alternating paths', () => {
    const builder = new GraphBuilder();
    for (let index = 0; index < 4; index++) builder.addVertex(name(index));
    for (const [from, to] of [
      [0, 2],
      [0, 3],
      [1, 2],
    ] as const)
      builder.addEdge(name(from), name(to));
    expect(maximumBipartiteMatching(builder.build()).size).toBe(2);
  });

  it('limits matches by the smaller side', () => {
    expect(maximumBipartiteMatching(starGraph(5)).size).toBe(1);
    expect(maximumBipartiteMatching(pathGraph(0)).size).toBe(0);
  });

  it('needs augmenting paths and rejects odd cycles', () => {
    const zigzag = new GraphBuilder()
      .addVertex(name(0))
      .addVertex(name(1))
      .addVertex(name(2))
      .addVertex(name(3))
      .addEdge(name(0), name(2))
      .addEdge(name(1), name(2))
      .addEdge(name(1), name(3))
      .build();
    expect(maximumBipartiteMatching(zigzag).size).toBe(2);
    expect(() => maximumBipartiteMatching(cycleGraph(5))).toThrow(GraphError);
  });
});
