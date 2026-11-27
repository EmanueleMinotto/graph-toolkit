import { describe, expect, it } from 'vitest';
import { GraphBuilder, vertexId, type Graph } from './index.js';

function lcg(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;

    return state / 2_147_483_648;
  };
}

function build(seed: number, directed: boolean, parallel: boolean): GraphBuilder {
  const next = lcg(seed);
  const builder = new GraphBuilder({ directed, allowParallelEdges: parallel });
  const count = 9;

  for (let index = 0; index < count; index++) {
    builder.addVertex(
      vertexId(`v${index}`),
      index % 3 === 0 ? { rank: index, tag: `t${index}` } : undefined,
    );
  }

  for (let attempt = 0; attempt < 24; attempt++) {
    const [from, to] = [Math.floor(next() * count), Math.floor(next() * count)];

    try {
      builder.addEdge(vertexId(`v${from}`), vertexId(`v${to}`), {
        weight: 1 + Math.floor(next() * 6),
        ...(attempt % 4 === 0 && { attributes: { road: attempt } }),
      });
    } catch {
      // duplicate edge in a simple graph: skipped on purpose
    }
  }

  return builder;
}

const dump = (graph: Graph) => ({
  directed: graph.directed,
  vertices: graph.vertices(),
  edges: graph
    .edges()
    .map((edge) => [edge.source, edge.target, edge.weight, edge.attributes ?? null]),
  attributes: graph.vertices().map((id) => graph.vertexAttributes(id)),
  degrees: graph.vertices().map((id) => graph.degree(id)),
  neighbors: graph
    .vertices()
    .map((id) => graph.neighbors(id).map((edge) => `${edge.target}:${edge.weight}`)),
  offsets: [...graph.csr.offsets],
  targets: [...graph.csr.targets],
  weights: [...graph.csr.weights],
  edgeCount: graph.edgeCount,
});

const buildCases = () => {
  const edited = (seed: number, directed: boolean) => {
    const builder = build(seed, directed, false);

    builder.removeVertex(vertexId('v2'));
    builder.removeVertex(vertexId('v6'));
    builder.addVertex(vertexId('late'), { fresh: true });
    builder.addEdge(vertexId('late'), vertexId('v0'), 9);

    return builder;
  };

  return {
    undirected: dump(build(1, false, false).build()),
    directed: dump(build(2, true, false).build()),
    parallel: dump(build(3, false, true).build()),
    editedUndirected: dump(edited(4, false).build()),
    editedDirected: dump(edited(5, true).build()),
    copy: dump(
      GraphBuilder.from(build(6, false, true).build())
        .removeVertex(vertexId('v4'))
        .build(),
    ),
  };
};

describe('pinned results', () => {
  it('keeps the seeded results of the graph builder', () => {
    expect(buildCases()).toEqual({
      copy: {
        attributes: [
          { rank: 0, tag: 't0' },
          {},
          {},
          { rank: 3, tag: 't3' },
          {},
          { rank: 6, tag: 't6' },
          {},
          {},
        ],
        degrees: [6, 4, 4, 2, 5, 4, 7, 4],
        directed: false,
        edgeCount: 20,
        edges: [
          ['v0', 'v7', 3, { road: 0 }],
          ['v0', 'v1', 1, { road: 8 }],
          ['v0', 'v5', 3, null],
          ['v0', 'v5', 1, null],
          ['v0', 'v7', 2, null],
          ['v0', 'v3', 1, null],
          ['v1', 'v6', 5, null],
          ['v1', 'v6', 3, { road: 12 }],
          ['v1', 'v7', 1, null],
          ['v2', 'v7', 1, null],
          ['v2', 'v2', 1, { road: 20 }],
          ['v2', 'v7', 4, null],
          ['v2', 'v8', 5, null],
          ['v3', 'v8', 6, null],
          ['v5', 'v5', 1, null],
          ['v5', 'v5', 3, { road: 16 }],
          ['v5', 'v8', 4, null],
          ['v6', 'v7', 4, null],
          ['v6', 'v6', 6, null],
          ['v7', 'v8', 6, null],
        ],
        neighbors: [
          ['v7:3', 'v1:1', 'v5:3', 'v5:1', 'v7:2', 'v3:1'],
          ['v6:5', 'v6:3', 'v7:1', 'v0:1'],
          ['v7:1', 'v2:1', 'v7:4', 'v8:5'],
          ['v8:6', 'v0:1'],
          ['v5:1', 'v5:3', 'v8:4', 'v0:3', 'v0:1'],
          ['v7:4', 'v6:6', 'v1:5', 'v1:3'],
          ['v8:6', 'v0:3', 'v0:2', 'v1:1', 'v2:1', 'v2:4', 'v6:4'],
          ['v2:5', 'v3:6', 'v5:4', 'v7:6'],
        ],
        offsets: [0, 6, 10, 14, 16, 21, 25, 32, 36],
        targets: [
          6, 1, 4, 4, 6, 3, 5, 5, 6, 0, 6, 2, 6, 7, 7, 0, 4, 4, 7, 0, 0, 6, 5, 1, 1, 7, 0, 0, 1, 2,
          2, 5, 2, 3, 4, 6,
        ],
        vertices: ['v0', 'v1', 'v2', 'v3', 'v5', 'v6', 'v7', 'v8'],
        weights: [
          3, 1, 3, 1, 2, 1, 5, 3, 1, 1, 1, 1, 4, 5, 6, 1, 1, 3, 4, 3, 1, 4, 6, 5, 3, 6, 3, 2, 1, 1,
          4, 4, 5, 6, 4, 6,
        ],
      },
      directed: {
        attributes: [
          { rank: 0, tag: 't0' },
          {},
          {},
          { rank: 3, tag: 't3' },
          {},
          {},
          { rank: 6, tag: 't6' },
          {},
          {},
        ],
        degrees: [1, 2, 1, 4, 3, 2, 2, 3, 5],
        directed: true,
        edgeCount: 23,
        edges: [
          ['v0', 'v6', 2, { road: 0 }],
          ['v1', 'v6', 2, null],
          ['v1', 'v5', 4, null],
          ['v2', 'v3', 2, null],
          ['v3', 'v7', 5, { road: 4 }],
          ['v3', 'v8', 4, null],
          ['v3', 'v3', 1, { road: 16 }],
          ['v3', 'v0', 5, { road: 20 }],
          ['v4', 'v8', 2, null],
          ['v4', 'v5', 6, null],
          ['v4', 'v2', 2, null],
          ['v5', 'v5', 2, null],
          ['v5', 'v2', 6, null],
          ['v6', 'v5', 1, null],
          ['v6', 'v6', 4, { road: 12 }],
          ['v7', 'v4', 4, null],
          ['v7', 'v5', 6, null],
          ['v7', 'v0', 1, null],
          ['v8', 'v2', 1, null],
          ['v8', 'v8', 6, null],
          ['v8', 'v5', 5, null],
          ['v8', 'v1', 1, null],
          ['v8', 'v7', 6, null],
        ],
        neighbors: [
          ['v6:2'],
          ['v6:2', 'v5:4'],
          ['v3:2'],
          ['v7:5', 'v8:4', 'v3:1', 'v0:5'],
          ['v8:2', 'v5:6', 'v2:2'],
          ['v5:2', 'v2:6'],
          ['v5:1', 'v6:4'],
          ['v4:4', 'v5:6', 'v0:1'],
          ['v2:1', 'v8:6', 'v5:5', 'v1:1', 'v7:6'],
        ],
        offsets: [0, 1, 3, 4, 8, 11, 13, 15, 18, 23],
        targets: [6, 6, 5, 3, 7, 8, 3, 0, 8, 5, 2, 5, 2, 5, 6, 4, 5, 0, 2, 8, 5, 1, 7],
        vertices: ['v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'],
        weights: [2, 2, 4, 2, 5, 4, 1, 5, 2, 6, 2, 2, 6, 1, 4, 4, 6, 1, 1, 6, 5, 1, 6],
      },
      editedDirected: {
        attributes: [
          { rank: 0, tag: 't0' },
          {},
          { rank: 3, tag: 't3' },
          {},
          {},
          {},
          {},
          { fresh: true },
        ],
        degrees: [3, 2, 2, 3, 0, 1, 1, 1],
        directed: true,
        edgeCount: 13,
        edges: [
          ['v0', 'v0', 6, null],
          ['v0', 'v8', 6, null],
          ['v0', 'v5', 6, null],
          ['v1', 'v4', 3, null],
          ['v1', 'v5', 2, { road: 16 }],
          ['v3', 'v3', 5, null],
          ['v3', 'v5', 5, null],
          ['v4', 'v3', 3, null],
          ['v4', 'v7', 1, { road: 8 }],
          ['v4', 'v5', 5, null],
          ['v7', 'v4', 5, null],
          ['v8', 'v4', 4, null],
          ['late', 'v0', 9, null],
        ],
        neighbors: [
          ['v0:6', 'v8:6', 'v5:6'],
          ['v4:3', 'v5:2'],
          ['v3:5', 'v5:5'],
          ['v3:3', 'v7:1', 'v5:5'],
          [],
          ['v4:5'],
          ['v4:4'],
          ['v0:9'],
        ],
        offsets: [0, 3, 5, 7, 10, 10, 11, 12, 13],
        targets: [0, 6, 4, 3, 4, 2, 4, 2, 5, 4, 3, 3, 0],
        vertices: ['v0', 'v1', 'v3', 'v4', 'v5', 'v7', 'v8', 'late'],
        weights: [6, 6, 6, 3, 2, 5, 5, 3, 1, 5, 5, 4, 9],
      },
      editedUndirected: {
        attributes: [
          { rank: 0, tag: 't0' },
          {},
          { rank: 3, tag: 't3' },
          {},
          {},
          {},
          {},
          { fresh: true },
        ],
        degrees: [4, 3, 2, 5, 3, 2, 2, 1],
        directed: false,
        edgeCount: 12,
        edges: [
          ['v0', 'v4', 5, { road: 8 }],
          ['v0', 'v7', 6, { road: 16 }],
          ['v0', 'v5', 5, { road: 4 }],
          ['v0', 'late', 9, null],
          ['v1', 'v1', 2, null],
          ['v1', 'v3', 2, { road: 12 }],
          ['v1', 'v4', 2, null],
          ['v3', 'v4', 1, null],
          ['v4', 'v7', 6, null],
          ['v4', 'v5', 5, { road: 20 }],
          ['v5', 'v8', 1, null],
          ['v8', 'v8', 1, null],
        ],
        neighbors: [
          ['v4:5', 'v7:6', 'v5:5', 'late:9'],
          ['v1:2', 'v3:2', 'v4:2'],
          ['v1:2', 'v4:1'],
          ['v7:6', 'v3:1', 'v1:2', 'v0:5', 'v5:5'],
          ['v8:1', 'v0:5', 'v4:5'],
          ['v4:6', 'v0:6'],
          ['v8:1', 'v5:1'],
          ['v0:9'],
        ],
        offsets: [0, 4, 7, 9, 14, 17, 19, 21, 22],
        targets: [3, 5, 4, 7, 1, 2, 3, 1, 3, 5, 2, 1, 0, 4, 6, 0, 3, 3, 0, 6, 4, 0],
        vertices: ['v0', 'v1', 'v3', 'v4', 'v5', 'v7', 'v8', 'late'],
        weights: [5, 6, 5, 9, 2, 2, 2, 2, 1, 6, 1, 2, 5, 5, 1, 5, 5, 6, 6, 1, 1, 9],
      },
      parallel: {
        attributes: [
          { rank: 0, tag: 't0' },
          {},
          {},
          { rank: 3, tag: 't3' },
          {},
          {},
          { rank: 6, tag: 't6' },
          {},
          {},
        ],
        degrees: [4, 7, 8, 6, 2, 4, 7, 7, 1],
        directed: false,
        edgeCount: 24,
        edges: [
          ['v0', 'v6', 1, null],
          ['v0', 'v2', 3, null],
          ['v0', 'v7', 3, { road: 20 }],
          ['v0', 'v8', 6, { road: 8 }],
          ['v1', 'v3', 5, null],
          ['v1', 'v2', 4, { road: 12 }],
          ['v1', 'v2', 5, null],
          ['v1', 'v7', 3, null],
          ['v1', 'v1', 3, null],
          ['v1', 'v4', 5, { road: 0 }],
          ['v1', 'v7', 6, null],
          ['v2', 'v5', 6, null],
          ['v2', 'v6', 3, { road: 4 }],
          ['v2', 'v5', 3, null],
          ['v2', 'v3', 6, null],
          ['v2', 'v6', 4, null],
          ['v3', 'v6', 4, null],
          ['v3', 'v7', 2, null],
          ['v3', 'v7', 4, null],
          ['v3', 'v6', 6, { road: 16 }],
          ['v4', 'v5', 1, null],
          ['v5', 'v5', 2, null],
          ['v6', 'v7', 3, null],
          ['v6', 'v7', 4, null],
        ],
        neighbors: [
          ['v6:1', 'v2:3', 'v7:3', 'v8:6'],
          ['v3:5', 'v2:4', 'v2:5', 'v7:3', 'v1:3', 'v4:5', 'v7:6'],
          ['v5:6', 'v6:3', 'v5:3', 'v1:4', 'v3:6', 'v6:4', 'v0:3', 'v1:5'],
          ['v6:4', 'v2:6', 'v7:2', 'v1:5', 'v7:4', 'v6:6'],
          ['v1:5', 'v5:1'],
          ['v5:2', 'v2:3', 'v2:6', 'v4:1'],
          ['v2:3', 'v2:4', 'v3:6', 'v7:3', 'v3:4', 'v0:1', 'v7:4'],
          ['v3:2', 'v1:6', 'v3:4', 'v6:4', 'v1:3', 'v0:3', 'v6:3'],
          ['v0:6'],
        ],
        offsets: [0, 4, 11, 19, 25, 27, 31, 38, 45, 46],
        targets: [
          6, 2, 7, 8, 3, 2, 2, 7, 1, 4, 7, 5, 6, 5, 1, 3, 6, 0, 1, 6, 2, 7, 1, 7, 6, 1, 5, 5, 2, 2,
          4, 2, 2, 3, 7, 3, 0, 7, 3, 1, 3, 6, 1, 0, 6, 0,
        ],
        vertices: ['v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'],
        weights: [
          1, 3, 3, 6, 5, 4, 5, 3, 3, 5, 6, 6, 3, 3, 4, 6, 4, 3, 5, 4, 6, 2, 5, 4, 6, 5, 1, 2, 3, 6,
          1, 3, 4, 6, 3, 4, 1, 4, 2, 6, 4, 4, 3, 3, 3, 6,
        ],
      },
      undirected: {
        attributes: [
          { rank: 0, tag: 't0' },
          {},
          {},
          { rank: 3, tag: 't3' },
          {},
          {},
          { rank: 6, tag: 't6' },
          {},
          {},
        ],
        degrees: [5, 4, 3, 4, 4, 5, 7, 3, 3],
        directed: false,
        edgeCount: 20,
        edges: [
          ['v0', 'v8', 1, null],
          ['v0', 'v6', 6, null],
          ['v0', 'v3', 6, null],
          ['v0', 'v1', 2, { road: 16 }],
          ['v0', 'v5', 6, null],
          ['v1', 'v2', 6, null],
          ['v1', 'v4', 1, { road: 0 }],
          ['v1', 'v6', 1, null],
          ['v2', 'v2', 5, null],
          ['v2', 'v8', 1, null],
          ['v3', 'v4', 6, { road: 4 }],
          ['v3', 'v7', 2, null],
          ['v3', 'v5', 4, null],
          ['v4', 'v5', 3, { road: 12 }],
          ['v4', 'v6', 1, null],
          ['v5', 'v7', 4, { road: 8 }],
          ['v5', 'v6', 2, null],
          ['v6', 'v6', 6, null],
          ['v6', 'v8', 6, null],
          ['v6', 'v7', 6, null],
        ],
        neighbors: [
          ['v8:1', 'v6:6', 'v3:6', 'v1:2', 'v5:6'],
          ['v2:6', 'v4:1', 'v0:2', 'v6:1'],
          ['v2:5', 'v8:1', 'v1:6'],
          ['v4:6', 'v7:2', 'v5:4', 'v0:6'],
          ['v1:1', 'v5:3', 'v3:6', 'v6:1'],
          ['v0:6', 'v7:4', 'v3:4', 'v6:2', 'v4:3'],
          ['v4:1', 'v1:1', 'v6:6', 'v0:6', 'v8:6', 'v5:2', 'v7:6'],
          ['v3:2', 'v6:6', 'v5:4'],
          ['v6:6', 'v0:1', 'v2:1'],
        ],
        offsets: [0, 5, 9, 12, 16, 20, 25, 32, 35, 38],
        targets: [
          8, 6, 3, 1, 5, 2, 4, 0, 6, 2, 8, 1, 4, 7, 5, 0, 1, 5, 3, 6, 0, 7, 3, 6, 4, 4, 1, 6, 0, 8,
          5, 7, 3, 6, 5, 6, 0, 2,
        ],
        vertices: ['v0', 'v1', 'v2', 'v3', 'v4', 'v5', 'v6', 'v7', 'v8'],
        weights: [
          1, 6, 6, 2, 6, 6, 1, 2, 1, 5, 1, 6, 6, 2, 4, 6, 1, 3, 6, 1, 6, 4, 4, 2, 3, 1, 1, 6, 6, 6,
          2, 6, 2, 6, 4, 6, 1, 1,
        ],
      },
    });
  });
});
