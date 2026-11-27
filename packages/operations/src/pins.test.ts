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
    expect(buildCases()).toEqual({
      cartesian: [
        [
          '(0,0)-(1,0):1',
          '(0,0)-(0,1):1',
          '(0,0)-(0,2):1',
          '(0,1)-(1,1):1',
          '(0,1)-(0,2):1',
          '(0,2)-(1,2):1',
          '(1,0)-(2,0):1',
          '(1,0)-(1,1):1',
          '(1,0)-(1,2):1',
          '(1,1)-(2,1):1',
          '(1,1)-(1,2):1',
          '(1,2)-(2,2):1',
          '(2,0)-(2,1):1',
          '(2,0)-(2,2):1',
          '(2,1)-(2,2):1',
        ],
        [
          '(0,0)-(1,0):1',
          '(0,0)-(0,1):2',
          '(0,1)-(1,1):1',
          '(1,0)-(2,0):2',
          '(1,0)-(1,1):2',
          '(1,1)-(2,1):2',
          '(2,0)-(2,1):2',
        ],
      ],
      complement: [
        [
          '0-5:1',
          '0-6:1',
          '1-2:1',
          '1-4:1',
          '1-5:1',
          '1-6:1',
          '2-5:1',
          '2-6:1',
          '3-5:1',
          '3-6:1',
          '4-6:1',
          '5-6:1',
        ],
        [
          '0-2:1',
          '0-3:1',
          '0-4:1',
          '0-5:1',
          '1-0:1',
          '1-2:1',
          '1-4:1',
          '1-5:1',
          '2-0:1',
          '2-1:1',
          '2-4:1',
          '3-0:1',
          '3-1:1',
          '3-2:1',
          '3-4:1',
          '4-0:1',
          '4-1:1',
          '4-2:1',
          '4-3:1',
          '4-5:1',
          '5-0:1',
          '5-1:1',
          '5-2:1',
          '5-3:1',
          '5-4:1',
        ],
      ],
      contract: [
        ['0-2:2', '0-3:3', '0-4:1', '2-3:3', '2-4:1', '3-4:2', '4-5:3'],
        ['0-1:1', '1-5:2', '2-1:3', '2-5:1'],
      ],
      editDistance: [1, 4, 10],
      induced: ['0-2:2', '0-3:3', '2-3:3'],
      intersection: [
        ['0-1:1', '0-2:2', '0-3:3', '3-4:2'],
        ['0-1:1', '1-3:2', '2-5:1'],
      ],
      isomorphism: [
        true,
        false,
        [
          ['0', '0'],
          ['1', '1'],
          ['2', '2'],
          ['3', '3'],
          ['4', '4'],
          ['5', '5'],
          ['6', '6'],
        ],
      ],
      line: [
        [
          '0--1-0--2:1',
          '0--1-0--3:1',
          '0--1-0--4:1',
          '0--1-1--3:1',
          '0--2-0--3:1',
          '0--2-0--4:1',
          '0--2-2--3:1',
          '0--2-2--4:1',
          '0--3-0--4:1',
          '0--3-1--3:1',
          '0--3-2--3:1',
          '0--3-3--4:1',
          '0--4-2--4:1',
          '0--4-3--4:1',
          '0--4-4--5:1',
          '1--3-2--3:1',
          '1--3-3--4:1',
          '2--3-2--4:1',
          '2--3-3--4:1',
          '2--4-3--4:1',
          '2--4-4--5:1',
          '3--4-4--5:1',
        ],
        ['0->1-1->3:1', '1->3-3->5:1', '2->3-3->5:1'],
      ],
      tensor: [
        [
          '(0,0)-(1,1):2',
          '(0,0)-(1,2):3',
          '(0,1)-(1,0):2',
          '(0,1)-(1,2):1',
          '(0,2)-(1,0):3',
          '(0,2)-(1,1):1',
          '(1,0)-(2,1):4',
          '(1,0)-(2,2):6',
          '(1,1)-(2,0):4',
          '(1,1)-(2,2):2',
          '(1,2)-(2,0):6',
          '(1,2)-(2,1):2',
        ],
        [
          '(0,0)-(1,1):2',
          '(0,1)-(1,2):3',
          '(1,0)-(3,1):4',
          '(1,1)-(3,2):6',
          '(2,0)-(3,1):6',
          '(2,0)-(5,1):2',
          '(2,1)-(3,2):9',
          '(2,1)-(5,2):3',
          '(3,0)-(5,1):4',
          '(3,1)-(5,2):6',
        ],
      ],
      transpose: ['1-0:1', '3-1:2', '3-2:3', '5-2:1', '5-3:2'],
      union: [
        [
          '0-1:1',
          '0-2:2',
          '0-3:3',
          '0-4:1',
          '1-3:2',
          '1-4:2',
          '1-5:3',
          '2-3:3',
          '2-4:1',
          '2-5:1',
          '2-6:2',
          '3-4:2',
          '3-5:1',
          '4-5:3',
          '5-6:2',
        ],
        ['0-1:1', '0-3:1', '0-4:2', '0-5:3', '1-3:2', '1-4:2', '2-3:3', '2-5:1', '3-5:2'],
      ],
    });
  });
});
