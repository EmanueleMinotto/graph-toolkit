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
    expect(buildCases()).toEqual({});
  });
});
