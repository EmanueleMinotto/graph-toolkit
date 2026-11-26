import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { pathGraph, randomGraph } from '@graph-sdk/generators';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { fromBinary, fromEdgeList, ParseError, toBinary } from './index.js';

const summary = (graph: Graph) => ({
  directed: graph.directed,
  vertices: graph.vertices(),
  edges: graph.edges(),
});

const HEADER = [0x47, 0x54, 0x42, 0x01];
const bytes = (...values: readonly number[]): Uint8Array => Uint8Array.from(values);

describe('binary format', () => {
  it('round-trips structure, weights, order and unusual names', () => {
    const long = 'x'.repeat(300);
    const graph = new GraphBuilder({ directed: true })
      .addVertex(vertexId('héllo'))
      .addVertex(vertexId('日本語 🎌'))
      .addVertex(vertexId(long))
      .addVertex(vertexId('isolated'))
      .addEdge(vertexId('héllo'), vertexId('日本語 🎌'))
      .addEdge(vertexId('日本語 🎌'), vertexId(long), -2.5)
      .addEdge(vertexId(long), vertexId(long), Infinity)
      .build();

    expect(summary(fromBinary(toBinary(graph)))).toEqual(summary(graph));
  });

  it('round-trips random graphs, including ones larger than the first buffer', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 40 }),
        fc.integer(),
        fc.boolean(),
        (count, seed, flag) => {
          const graph = randomGraph(count, { probability: 0.2, seed, directed: flag });

          expect(summary(fromBinary(toBinary(graph)))).toEqual(summary(graph));
        },
      ),
    );
  });

  it('is much smaller than the text formats for unit-weight graphs', () => {
    const graph = pathGraph(200);
    const text = [...graph.edges()].map((edge) => `${edge.source},${edge.target},1`).join('\n');

    expect(toBinary(graph).length).toBeLessThan(text.length);
    expect(summary(fromEdgeList(text))).toEqual(summary(fromBinary(toBinary(graph))));
  });

  it('rejects every truncation of a valid document', () => {
    const full = toBinary(
      new GraphBuilder()
        .addVertex(vertexId('a'))
        .addVertex(vertexId('b'))
        .addEdge(vertexId('a'), vertexId('b'), 4)
        .build(),
    );

    for (let length = 0; length < full.length; length++) {
      expect(() => fromBinary(full.slice(0, length))).toThrow(ParseError);
    }
  });

  it('rejects malformed documents', () => {
    const cases: readonly (readonly number[])[] = [
      [0x00, 0x54, 0x42, 0x01, 0, 0, 0],
      [0x47, 0x54, 0x42, 0x02, 0, 0, 0],
      [...HEADER, 2, 0, 0],
      [...HEADER, 0, 0, 0, 7],
      [...HEADER, 0, 100, 0],
      [...HEADER, 0, 2, 0, 1, 97, 1, 97],
      [...HEADER, 0, 1, 0, 1, 0xff],
      [...HEADER, 0, 1, 0, 5, 97],
      [...HEADER, 0, 1, 1, 1, 97, 0, 5, 0],
      [...HEADER, 0, 1, 1, 1, 97, 0, 0, 2],
      [...HEADER, 0, 0x80, 0x80, 0x80, 0x80, 0x80, 0x80, 0x01],
    ];

    for (const values of cases) {
      expect(() => fromBinary(bytes(...values))).toThrow(ParseError);
    }
  });
});
