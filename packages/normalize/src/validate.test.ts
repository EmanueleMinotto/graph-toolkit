import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { completeGraph, pathGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import { assertValidGraph, validateGraph, ValidationError, type GraphSchema } from './index.js';

const codes = (graph: Graph, schema: GraphSchema) =>
  validateGraph(graph, schema).map((found) => found.code);

describe('validateGraph', () => {
  it('accepts anything against an empty schema', () => {
    expect(validateGraph(completeGraph(4), {})).toEqual([]);
  });

  it('checks direction, size and connectivity', () => {
    expect(codes(pathGraph(3), { directed: true })).toEqual(['direction']);
    expect(codes(pathGraph(3, { directed: true }), { directed: true })).toEqual([]);
    expect(codes(pathGraph(3), { directed: false })).toEqual([]);
    expect(codes(pathGraph(3, { directed: true }), { directed: false })).toEqual(['direction']);

    expect(codes(completeGraph(4), { maxVertices: 3, maxEdges: 5 })).toEqual([
      'too-many-vertices',
      'too-many-edges',
    ]);

    expect(codes(completeGraph(4), { maxVertices: 4, maxEdges: 6 })).toEqual([]);
    const split = new GraphBuilder().addVertex(vertexId('a')).addVertex(vertexId('b')).build();

    expect(codes(split, { connected: true })).toEqual(['disconnected']);
    expect(codes(pathGraph(1), { connected: true })).toEqual([]);
    expect(codes(pathGraph(3), { connected: true })).toEqual([]);
  });

  it('checks loops and isolated vertices', () => {
    const graph = new GraphBuilder()
      .addVertex(vertexId('a'))
      .addVertex(vertexId('b'))
      .addEdge(vertexId('a'), vertexId('a'))
      .build();

    expect(codes(graph, { allowSelfLoops: false, allowIsolated: false })).toEqual([
      'self-loop',
      'isolated-vertex',
    ]);

    expect(codes(graph, {})).toEqual([]);
    expect(validateGraph(graph, { allowIsolated: false })[0]?.vertices).toEqual(['b']);
    expect(codes(pathGraph(3), { allowSelfLoops: false, allowIsolated: false })).toEqual([]);
  });

  it('checks ids and weights', () => {
    const graph = new GraphBuilder()
      .addVertex(vertexId('v1'))
      .addVertex(vertexId('x'))
      .addEdge(vertexId('v1'), vertexId('x'), 2.5)
      .build();

    expect(codes(graph, { vertexIdPattern: /^v\d+$/ })).toEqual(['vertex-id']);
    expect(codes(graph, { weight: { isInteger: true } })).toEqual(['weight']);
    expect(codes(graph, { weight: { min: 3 } })).toEqual(['weight']);
    expect(codes(graph, { weight: { max: 2 } })).toEqual(['weight']);
    expect(codes(graph, { weight: { min: 0, max: 3 } })).toEqual([]);
    expect(codes(graph, { vertexIdPattern: /./ })).toEqual([]);
  });
});

describe('assertValidGraph', () => {
  it('throws a ValidationError listing every issue', () => {
    const schema = { directed: true, maxEdges: 1 };

    expect(() => {
      assertValidGraph(completeGraph(3), schema);
    }).toThrow(ValidationError);

    const thrown = (): unknown => {
      try {
        assertValidGraph(completeGraph(3), schema);

        return undefined;
      } catch (error) {
        return error;
      }
    };

    expect(thrown()).toMatchObject({ issues: [{ code: 'direction' }, { code: 'too-many-edges' }] });

    expect(() => {
      assertValidGraph(completeGraph(3), {});
    }).not.toThrow();
  });
});
