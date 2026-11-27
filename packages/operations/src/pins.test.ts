import { GraphBuilder, type Graph } from '@graph-sdk/core';
import { cycleGraph, pathGraph, randomGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  areIsomorphic,
  cartesianProduct,
  complement,
  contractEdge,
  findGraphIsomorphism,
  graphEditDistance,
  inducedSubgraph,
  intersection,
  lineGraph,
  tensorProduct,
  transpose,
  union,
} from './index.js';

const listed = (graph: Graph): string[] =>
  graph.edges().map((edge) => `${edge.source}-${edge.target}:${edge.weight}`);

function weighted(graph: Graph, directed: boolean, shift: number): Graph {
  const builder = new GraphBuilder({ directed });

  for (const id of graph.vertices()) {
    builder.addVertex(id);
  }

  for (const [index, edge] of graph.edges().entries()) {
    builder.addEdge(edge.source, edge.target, 1 + ((index + shift) % 3));
  }

  return builder.build();
}

const buildCases = () => {
  const left = weighted(randomGraph(7, { probability: 0.4, seed: 51 }), false, 0);
  const right = weighted(randomGraph(7, { probability: 0.4, seed: 52 }), false, 1);
  const leftDirected = weighted(randomGraph(6, { probability: 0.4, seed: 53 }), true, 0);
  const rightDirected = weighted(randomGraph(6, { probability: 0.4, seed: 54 }), true, 2);
  const ids = left.vertices();
  const permuted = randomGraph(7, { probability: 0.4, seed: 51 });

  return {
    union: [listed(union(left, right)), listed(union(leftDirected, rightDirected))],
    intersection: [
      listed(intersection(left, right)),
      listed(intersection(leftDirected, rightDirected)),
    ],
    complement: [listed(complement(left)), listed(complement(leftDirected))],
    transpose: listed(transpose(leftDirected)),
    induced: listed(inducedSubgraph(left, [ids[0]!, ids[2]!, ids[3]!, ids[5]!])),
    cartesian: [
      listed(cartesianProduct(pathGraph(3), cycleGraph(3))),
      listed(cartesianProduct(weighted(pathGraph(3), true, 0), weighted(pathGraph(2), true, 1))),
    ],
    tensor: [
      listed(tensorProduct(weighted(pathGraph(3), false, 0), weighted(cycleGraph(3), false, 1))),
      listed(tensorProduct(leftDirected, weighted(pathGraph(3), true, 1))),
    ],
    line: [listed(lineGraph(left)), listed(lineGraph(leftDirected))],
    contract: [
      listed(contractEdge(left, left.edges()[0]!.source, left.edges()[0]!.target)),
      listed(
        contractEdge(
          leftDirected,
          leftDirected.edges()[1]!.source,
          leftDirected.edges()[1]!.target,
        ),
      ),
    ],
    editDistance: [
      graphEditDistance(pathGraph(4), cycleGraph(4)),
      graphEditDistance(
        randomGraph(5, { probability: 0.5, seed: 5 }),
        randomGraph(6, { probability: 0.5, seed: 6 }),
      ),
      graphEditDistance(pathGraph(3), pathGraph(5), { vertexCost: 2, edgeCost: 3 }),
    ],
    isomorphism: [
      areIsomorphic(left, permuted),
      areIsomorphic(left, right),
      [...(findGraphIsomorphism(permuted, permuted) ?? new Map())],
    ],
  };
};

describe('pinned results', () => {
  it('keeps the seeded results of the operations', () => {
    expect(buildCases()).toEqual({});
  });
});
