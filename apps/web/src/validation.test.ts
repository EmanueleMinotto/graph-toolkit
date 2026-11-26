import { cycleGraph, GraphBuilder, pathGraph, vertexId } from 'graph-toolkit';
import { describe, expect, it } from 'vitest';
import { buildSchema, DEFAULT_FORM, validate } from './validation.js';

describe('validation form', () => {
  it('imposes no constraint by default', () => {
    expect(validate(cycleGraph(4), DEFAULT_FORM)).toEqual([]);
    expect(buildSchema(DEFAULT_FORM).directed).toBeUndefined();
  });

  it('reports each violated constraint', () => {
    const loop = new GraphBuilder()
      .addVertex(vertexId('a'))
      .addVertex(vertexId('b'))
      .addEdge(vertexId('a'), vertexId('a'), 2.5)
      .build();
    const issues = validate(loop, {
      ...DEFAULT_FORM,
      direction: 'directed',
      allowSelfLoops: false,
      allowIsolated: false,
      connected: true,
      maxVertices: 1,
      maxEdges: 0,
      pattern: '^[0-9]+$',
      minWeight: 3,
      maxWeight: 4,
      isInteger: true,
    });
    const codes = new Set(issues.map((issue) => issue.code));

    for (const code of [
      'direction',
      'disconnected',
      'isolated-vertex',
      'self-loop',
      'too-many-edges',
      'too-many-vertices',
      'vertex-id',
      'weight',
    ]) {
      expect(codes.has(code as never)).toBe(true);
    }
  });

  it('accepts a graph that meets the schema and rejects a bad pattern', () => {
    expect(
      validate(pathGraph(3), {
        ...DEFAULT_FORM,
        direction: 'undirected',
        connected: true,
        maxVertices: 3,
      }),
    ).toEqual([]);

    expect(() => validate(pathGraph(3), { ...DEFAULT_FORM, pattern: '(' })).toThrow();
  });
});
