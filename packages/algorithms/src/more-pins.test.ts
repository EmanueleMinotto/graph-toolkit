import { GraphBuilder, type Graph } from '@graph-sdk/core';
import { randomGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  articulationPoints,
  bridges,
  isPlanar,
  kCores,
  leiden,
  louvain,
  maxFlow,
  maxFlowDinic,
  maximumBipartiteMatching,
  maximumMatching,
  minCostFlow,
  minimumCostAssignment,
  treewidth,
} from './index.js';

const seeds = [101, 102, 103, 104, 105, 106, 107, 108];

function weighted(graph: Graph, directed: boolean): Graph {
  const builder = new GraphBuilder({ directed });

  for (const id of graph.vertices()) {
    builder.addVertex(id);
  }

  for (const [index, edge] of graph.edges().entries()) {
    builder.addEdge(edge.source, edge.target, 1 + ((index * 3 + Number(edge.source)) % 5));
  }

  return builder.build();
}

const capacity = (edge: { weight: number }): number => edge.weight;

const flowCases = () =>
  seeds.slice(0, 5).map((seed) => {
    const graph = weighted(randomGraph(9, { probability: 0.4, seed }), true);
    const [source, sink] = [graph.vertices()[0]!, graph.vertices()[8]!];

    return [
      maxFlow(graph, source, sink),
      maxFlowDinic(graph, source, sink),
      minCostFlow(graph, { source, sink }, { capacity }),
      minCostFlow(graph, { source, sink }, { capacity, amount: 2 }),
    ];
  });

const communityCases = () =>
  seeds.map((seed) => {
    const graph = randomGraph(30, { probability: 0.1, seed });
    const weightedGraph = weighted(graph, false);

    return [
      [...louvain(graph).values()],
      [...leiden(graph).values()],
      [...louvain(weightedGraph, { resolution: 1.7 }).values()],
      [...leiden(weightedGraph, { resolution: 0.6 }).values()],
    ];
  });

const structureCases = () =>
  seeds.map((seed) => {
    const graph = randomGraph(14, { probability: 0.17, seed });

    return [
      maximumMatching(graph).pairs.map(([left, right]) => `${left}-${right}`),
      articulationPoints(graph),
      bridges(graph).map(([left, right]) => `${left}-${right}`),
      [...kCores(graph).values()],
      treewidth(randomGraph(10, { probability: 0.3, seed })),
    ];
  });

const planarCases = () =>
  seeds.flatMap((seed) => [
    isPlanar(randomGraph(9, { probability: 0.3, seed })),
    isPlanar(randomGraph(10, { probability: 0.45, seed })),
    isPlanar(randomGraph(12, { probability: 0.25, seed })),
  ]);

const bipartiteCases = () =>
  seeds.map((seed) => {
    const graph = randomGraph(14, { probability: 0.3, seed });
    const builder = new GraphBuilder();

    for (const id of graph.vertices()) {
      builder.addVertex(id);
    }

    for (const edge of graph.edges()) {
      if ((Number(edge.source) + Number(edge.target)) % 2 === 1) {
        builder.addEdge(edge.source, edge.target);
      }
    }

    return maximumBipartiteMatching(builder.build()).pairs.map(
      ([left, right]) => `${left}-${right}`,
    );
  });

const assignmentCases = () =>
  [5, 6, 7].map((size) =>
    minimumCostAssignment(
      Array.from({ length: size }, (_, row) =>
        Array.from(
          { length: size + (size % 2) },
          (_cell, column) => (((row + 3) * (column + 5) * 17 + size) % 29) - 9,
        ),
      ),
    ),
  );

describe('pinned results', () => {
  it('keeps the seeded results', () => {
    expect({
      flow: flowCases(),
      communities: communityCases(),
      structure: structureCases(),
      planar: planarCases(),
      bipartite: bipartiteCases(),
      assignment: assignmentCases(),
    }).toEqual({});
  });
});
