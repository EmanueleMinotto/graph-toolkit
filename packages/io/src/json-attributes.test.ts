import { GraphBuilder, vertexId } from '@graph-sdk/core';
import { describe, expect, it } from 'vitest';
import { fromJson, ParseError, toJson } from './index.js';

const [a, b, c] = ['a', 'b', 'c'].map(vertexId) as [
  ReturnType<typeof vertexId>,
  ReturnType<typeof vertexId>,
  ReturnType<typeof vertexId>,
];

const document = (extra: string): string =>
  `{"directed":false,"vertices":["a","b"],"edges":[{"source":"a","target":"b"}]${extra}}`;

describe('json attributes', () => {
  it('round-trips vertex and edge attributes', () => {
    const graph = new GraphBuilder({ allowParallelEdges: true })
      .addVertex(a, { label: 'start', depth: 0 })
      .addVertex(b)
      .addVertex(c)
      .addEdge(a, b, { weight: 4, attributes: { kind: 'road', open: true } })
      .addEdge(b, c)
      .build();
    const copy = fromJson(toJson(graph));

    expect(copy.vertexAttributes(a)).toEqual({ label: 'start', depth: 0 });
    expect(copy.vertexAttributes(b)).toEqual({});

    expect(copy.edgesBetween(a, b)).toEqual([
      { source: a, target: b, weight: 4, attributes: { kind: 'road', open: true } },
    ]);

    expect(copy.edgesBetween(b, c)[0]).not.toHaveProperty('attributes');
  });

  it('writes no attribute keys for graphs without attributes', () => {
    const graph = new GraphBuilder().addVertex(a).addVertex(b).addEdge(a, b).build();

    expect(toJson(graph)).not.toContain('ttributes');
  });

  it('ignores attributes of vertices that are not declared', () => {
    const graph = fromJson(document(',"vertexAttributes":{"a":{"x":1},"ghost":{"y":2}}'));

    expect(graph.vertexAttributes(a)).toEqual({ x: 1 });
    expect(graph.vertexCount).toBe(2);
  });

  it('rejects malformed attributes', () => {
    const bad = [
      ',"vertexAttributes":[]',
      ',"vertexAttributes":{"a":5}',
      ',"vertexAttributes":{"a":{"nested":{"deep":1}}}',
    ];

    for (const extra of bad) {
      expect(() => fromJson(document(extra))).toThrow(ParseError);
    }

    expect(() =>
      fromJson(
        '{"directed":false,"vertices":[],"edges":[{"source":"a","target":"b","attributes":[1]}]}',
      ),
    ).toThrow(ParseError);
  });
});
