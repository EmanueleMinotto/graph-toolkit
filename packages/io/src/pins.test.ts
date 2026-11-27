import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { randomGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  fromBinary,
  fromDimacs,
  fromDot,
  fromGexf,
  fromGml,
  fromGraph6,
  fromGraphMl,
  fromJson,
  fromMermaid,
  fromPajek,
  fromSparse6,
  toBinary,
  toDimacs,
  toDot,
  toGexf,
  toGml,
  toGraph6,
  toGraphMl,
  toJson,
  toMermaid,
  toPajek,
  toSparse6,
} from './index.js';

function weighted(graph: Graph, directed: boolean): Graph {
  const builder = new GraphBuilder({ directed });

  for (const id of graph.vertices()) {
    builder.addVertex(id);
  }

  for (const [index, edge] of graph.edges().entries()) {
    builder.addEdge(edge.source, edge.target, 1 + (index % 4) * 0.5);
  }

  return builder.build();
}

const listed = (graph: Graph): string[] =>
  graph.edges().map((edge) => `${edge.source}-${edge.target}:${edge.weight}`);

const buildCases = () => {
  const plain = randomGraph(70, { probability: 0.04, seed: 81 });
  const small = weighted(randomGraph(9, { probability: 0.35, seed: 82 }), false);
  const directed = weighted(randomGraph(8, { probability: 0.35, seed: 83 }), true);
  const named = new GraphBuilder()
    .addVertex(vertexId('x y'))
    .addVertex(vertexId('q"r'))
    .addVertex(vertexId('a&b'))
    .addEdge(vertexId('x y'), vertexId('q"r'), 2.5)
    .addEdge(vertexId('q"r'), vertexId('a&b'))
    .build();

  return {
    graph6: [
      toGraph6(plain),
      toGraph6(randomGraph(63, { probability: 0.05, seed: 84 })),
      toGraph6(small),
    ],
    graph6Back: [listed(fromGraph6(toGraph6(plain))).length, listed(fromGraph6(toGraph6(small)))],
    sparse6: [
      toSparse6(plain),
      toSparse6(small),
      toSparse6(randomGraph(5, { probability: 0.5, seed: 85 })),
    ],
    sparse6Back: [
      listed(fromSparse6(toSparse6(plain))).length,
      listed(fromSparse6(toSparse6(small))),
    ],
    dot: [toDot(small), toDot(directed), toDot(named)],
    dotBack: [
      listed(fromDot(toDot(small))),
      listed(fromDot(toDot(directed))),
      listed(fromDot(toDot(named))),
    ],
    json: [toJson(small), listed(fromJson(toJson(directed)))],
    gml: [toGml(small), listed(fromGml(toGml(directed))), listed(fromGml(toGml(named)))],
    graphml: [
      toGraphMl(small),
      listed(fromGraphMl(toGraphMl(directed))),
      listed(fromGraphMl(toGraphMl(named))),
    ],
    gexf: [toGexf(directed), listed(fromGexf(toGexf(small))), listed(fromGexf(toGexf(named)))],
    dimacs: [toDimacs(small), toDimacs(directed), listed(fromDimacs(toDimacs(directed)))],
    pajek: [
      toPajek(small),
      toPajek(directed),
      listed(fromPajek(toPajek(directed))),
      listed(fromPajek(toPajek(named))),
    ],
    mermaid: [
      toMermaid(small),
      toMermaid(directed),
      listed(fromMermaid(toMermaid(directed))),
      listed(fromMermaid(toMermaid(named))),
    ],
    binary: [
      [...toBinary(small)],
      listed(fromBinary(toBinary(directed))),
      listed(fromBinary(toBinary(named))),
    ],
  };
};

describe('pinned results', () => {
  it('keeps the output of the writers and the round trips', () => {
    expect(
      Object.fromEntries(
        Object.entries(buildCases()).map(([key, value]) => [key, JSON.stringify(value)]),
      ),
    ).toEqual({});
  });
});
