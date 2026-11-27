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
    }).toEqual({
      assignment: [
        { assignment: [4, 1, 2, 5, 3], cost: -8 },
        { assignment: [0, 4, 5, 1, 3, 2], cost: -19 },
        { assignment: [0, 6, 7, 1, 3, 2, 5], cost: -35 },
      ],
      bipartite: [
        ['0-1', '2-13', '6-11', '8-3', '10-5'],
        ['0-3', '2-7', '4-13', '8-9', '10-1', '12-11'],
        ['0-1', '2-7', '4-11', '6-9', '8-3', '10-5', '12-13'],
        ['1-12', '3-8', '4-5', '9-2', '11-6', '13-10'],
        ['0-9', '2-1', '4-5', '6-13', '8-7', '10-11'],
        ['0-1', '2-7', '4-3', '6-9', '10-13', '12-11'],
        ['0-13', '2-9', '4-5', '6-7', '8-1', '10-11'],
        ['0-3', '2-5', '4-9', '6-11', '8-13', '10-1', '12-7'],
      ],
      communities: [
        [
          [
            0, 1, 0, 2, 1, 2, 0, 2, 2, 3, 0, 1, 4, 1, 0, 3, 0, 1, 2, 2, 0, 3, 0, 1, 3, 2, 0, 0, 1,
            3,
          ],
          [
            0, 1, 0, 2, 1, 2, 0, 2, 2, 3, 4, 1, 5, 1, 0, 4, 0, 1, 2, 2, 0, 4, 0, 1, 3, 2, 0, 4, 1,
            3,
          ],
          [
            0, 1, 2, 2, 1, 3, 0, 2, 2, 0, 4, 1, 5, 1, 6, 4, 0, 1, 2, 2, 0, 4, 6, 1, 3, 2, 6, 6, 1,
            3,
          ],
          [
            0, 1, 2, 2, 1, 2, 0, 2, 2, 0, 0, 1, 3, 1, 1, 0, 0, 1, 2, 2, 0, 0, 0, 1, 2, 2, 0, 1, 1,
            2,
          ],
        ],
        [
          [
            0, 0, 1, 2, 3, 0, 3, 4, 0, 5, 6, 5, 0, 5, 1, 3, 1, 5, 1, 0, 3, 1, 5, 0, 5, 3, 0, 1, 3,
            7,
          ],
          [
            0, 0, 1, 2, 3, 0, 3, 4, 0, 5, 6, 5, 0, 5, 1, 3, 1, 5, 1, 0, 3, 1, 5, 0, 5, 3, 0, 1, 3,
            7,
          ],
          [
            0, 1, 2, 3, 4, 1, 5, 6, 7, 8, 9, 10, 7, 8, 7, 5, 4, 10, 2, 0, 5, 2, 8, 0, 10, 5, 0, 7,
            4, 11,
          ],
          [
            0, 1, 2, 3, 2, 1, 4, 5, 2, 0, 6, 0, 2, 0, 2, 4, 2, 0, 2, 0, 4, 2, 0, 0, 0, 4, 0, 2, 2,
            7,
          ],
        ],
        [
          [
            0, 1, 2, 2, 1, 0, 1, 0, 3, 0, 0, 1, 2, 1, 0, 2, 1, 4, 3, 3, 0, 4, 2, 0, 0, 3, 4, 1, 3,
            1,
          ],
          [
            0, 1, 2, 2, 1, 0, 1, 0, 3, 0, 0, 1, 2, 1, 0, 2, 1, 4, 3, 3, 0, 4, 2, 0, 0, 3, 4, 1, 3,
            1,
          ],
          [
            0, 1, 1, 1, 2, 0, 3, 4, 5, 0, 6, 1, 1, 2, 0, 2, 6, 3, 5, 5, 0, 3, 6, 4, 0, 5, 3, 1, 5,
            6,
          ],
          [
            0, 1, 1, 1, 2, 0, 2, 0, 3, 0, 2, 1, 1, 2, 0, 2, 2, 3, 3, 3, 0, 3, 2, 0, 0, 3, 3, 1, 3,
            2,
          ],
        ],
        [
          [
            0, 1, 2, 3, 4, 3, 5, 1, 0, 3, 2, 1, 4, 0, 3, 3, 1, 6, 3, 1, 4, 6, 2, 0, 2, 0, 6, 7, 3,
            6,
          ],
          [
            0, 1, 2, 3, 4, 3, 5, 1, 0, 3, 2, 1, 4, 0, 3, 3, 1, 6, 3, 1, 4, 6, 2, 0, 2, 0, 6, 7, 3,
            6,
          ],
          [
            0, 1, 2, 3, 4, 5, 6, 1, 7, 3, 2, 1, 4, 7, 3, 5, 1, 8, 3, 1, 4, 8, 7, 7, 2, 0, 8, 9, 5,
            8,
          ],
          [
            0, 0, 0, 1, 2, 1, 3, 0, 4, 1, 0, 0, 2, 4, 1, 1, 0, 5, 1, 0, 2, 5, 4, 4, 0, 0, 4, 6, 1,
            4,
          ],
        ],
        [
          [
            0, 1, 0, 0, 2, 2, 0, 0, 2, 3, 0, 0, 4, 1, 4, 0, 1, 4, 1, 2, 1, 1, 4, 2, 4, 4, 1, 2, 2,
            4,
          ],
          [
            0, 1, 0, 0, 2, 2, 0, 0, 2, 3, 0, 0, 4, 1, 4, 0, 1, 4, 1, 2, 1, 1, 4, 2, 4, 4, 1, 2, 2,
            4,
          ],
          [
            0, 1, 0, 0, 2, 3, 0, 4, 3, 5, 4, 0, 6, 1, 7, 4, 8, 4, 1, 2, 1, 8, 3, 2, 7, 6, 1, 3, 2,
            6,
          ],
          [
            0, 1, 0, 0, 2, 2, 0, 1, 2, 3, 1, 0, 4, 1, 4, 1, 5, 1, 1, 2, 1, 5, 2, 2, 4, 4, 1, 2, 2,
            4,
          ],
        ],
        [
          [
            0, 1, 1, 2, 3, 2, 0, 4, 0, 4, 0, 1, 3, 4, 5, 1, 0, 3, 1, 4, 1, 1, 2, 4, 0, 3, 2, 3, 0,
            1,
          ],
          [
            0, 1, 1, 2, 3, 2, 0, 4, 0, 4, 0, 1, 3, 4, 5, 1, 0, 3, 1, 4, 1, 1, 2, 4, 0, 3, 2, 3, 0,
            1,
          ],
          [
            0, 1, 2, 3, 4, 3, 5, 6, 5, 0, 6, 7, 0, 0, 8, 2, 6, 0, 1, 2, 7, 7, 3, 6, 5, 4, 3, 4, 6,
            2,
          ],
          [
            0, 0, 1, 2, 1, 2, 2, 3, 2, 1, 3, 0, 1, 0, 4, 1, 3, 1, 0, 1, 0, 0, 2, 3, 2, 1, 2, 1, 3,
            1,
          ],
        ],
        [
          [
            0, 1, 1, 2, 3, 4, 2, 4, 0, 3, 2, 4, 2, 3, 0, 2, 1, 5, 4, 4, 3, 5, 1, 3, 3, 5, 3, 0, 3,
            2,
          ],
          [
            0, 1, 1, 2, 3, 4, 2, 4, 0, 3, 2, 4, 2, 3, 0, 2, 1, 5, 4, 4, 3, 5, 1, 3, 3, 5, 3, 0, 3,
            2,
          ],
          [
            0, 1, 2, 3, 4, 5, 3, 0, 5, 4, 0, 2, 3, 5, 5, 3, 2, 3, 0, 2, 4, 5, 1, 4, 1, 1, 1, 5, 4,
            3,
          ],
          [
            0, 1, 0, 2, 3, 4, 2, 0, 0, 3, 0, 0, 2, 4, 4, 2, 0, 2, 0, 0, 3, 4, 1, 3, 1, 1, 1, 4, 3,
            2,
          ],
        ],
        [
          [
            0, 1, 2, 3, 4, 0, 1, 3, 0, 2, 3, 2, 4, 2, 1, 4, 1, 1, 0, 4, 5, 1, 2, 1, 0, 1, 2, 1, 4,
            2,
          ],
          [
            0, 1, 2, 3, 4, 0, 1, 3, 0, 2, 3, 2, 4, 2, 1, 4, 1, 1, 0, 4, 5, 1, 2, 1, 0, 1, 2, 1, 4,
            2,
          ],
          [
            0, 1, 2, 3, 4, 0, 1, 3, 4, 4, 3, 4, 4, 2, 1, 4, 5, 1, 0, 6, 7, 1, 6, 3, 0, 5, 6, 5, 6,
            2,
          ],
          [
            0, 1, 2, 2, 2, 0, 1, 2, 2, 2, 2, 2, 2, 2, 1, 2, 1, 1, 0, 3, 4, 1, 3, 2, 0, 1, 3, 1, 3,
            2,
          ],
        ],
      ],
      flow: [
        [6, 6, { cost: 28, flow: 6 }, { cost: 8, flow: 2 }],
        [1, 1, { cost: 1, flow: 1 }, { cost: 1, flow: 1 }],
        [9, 9, { cost: 73, flow: 9 }, { cost: 10, flow: 2 }],
        [0, 0, { cost: 0, flow: 0 }, { cost: 0, flow: 0 }],
        [5, 5, { cost: 37, flow: 5 }, { cost: 13, flow: 2 }],
      ],
      planar: [
        true,
        false,
        false,
        true,
        true,
        true,
        true,
        false,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        false,
        true,
        true,
        false,
        true,
        true,
        false,
        false,
      ],
      structure: [
        [
          ['0-11', '1-12', '2-4', '3-5', '6-8', '7-10', '9-13'],
          ['4', '1', '3', '0', '11'],
          ['4-2', '0-1', '3-5', '11-3', '0-11'],
          [1, 2, 1, 1, 2, 1, 2, 2, 2, 2, 2, 1, 2, 2],
          3,
        ],
        [
          ['0-4', '1-5', '2-11', '6-13', '7-9'],
          ['13', '6', '4', '5'],
          ['6-13', '4-6', '0-4', '5-12', '1-5'],
          [1, 1, 2, 0, 1, 1, 1, 2, 0, 2, 0, 2, 1, 2],
          2,
        ],
        [
          ['0-2', '1-13', '3-6', '4-12', '5-10', '7-8', '9-11'],
          ['13', '6', '8', '4', '2'],
          ['8-7', '4-12', '13-1', '6-13', '0-2'],
          [1, 1, 3, 2, 2, 3, 3, 1, 3, 2, 3, 3, 1, 1],
          4,
        ],
        [
          ['3-11', '4-12', '5-7', '8-9'],
          ['7', '10', '12', '11'],
          ['7-5', '10-7', '3-11'],
          [0, 0, 0, 1, 2, 1, 0, 1, 2, 2, 2, 2, 2, 0],
          2,
        ],
        [
          ['0-1', '2-13', '3-6', '4-8', '5-7', '10-11'],
          ['6', '8', '7', '5', '11', '10', '13', '1'],
          ['6-3', '13-6', '8-4', '7-8', '5-7', '11-5', '10-11', '1-12', '0-1'],
          [1, 2, 2, 1, 1, 1, 1, 1, 1, 0, 2, 1, 1, 2],
          2,
        ],
        [
          ['0-2', '1-13', '3-7', '4-10', '5-8', '6-9'],
          ['7', '8', '4', '13'],
          ['7-3', '8-5', '13-11', '4-10'],
          [2, 2, 2, 1, 2, 1, 2, 2, 2, 2, 1, 1, 2, 2],
          3,
        ],
        [
          ['0-12', '1-6', '2-8', '5-7', '9-10'],
          ['8', '10', '12', '5'],
          ['5-7', '8-2', '10-8', '10-9', '10-13', '0-12'],
          [1, 2, 1, 0, 2, 2, 2, 1, 1, 1, 2, 0, 2, 1],
          2,
        ],
        [
          ['0-9', '1-2', '3-12', '4-8', '5-13', '6-7', '10-11'],
          ['8'],
          ['8-4'],
          [2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 2, 2, 2],
          3,
        ],
      ],
    });
  });
});
