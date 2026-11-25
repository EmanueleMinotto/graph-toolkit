import { completeGraph, cycleGraph, GraphBuilder, pathGraph, vertexId } from 'graph-toolkit';
import { describe, expect, it } from 'vitest';
import { analyze } from './analysis.js';

const none = { from: undefined, to: undefined };

describe('matrix analyses', () => {
  it('shows adjacency and Laplacian matrices', () => {
    const adjacency = analyze('adjacency', pathGraph(3), none);
    expect(adjacency.matrix?.rows).toEqual([
      [0, 1, 0],
      [1, 0, 1],
      [0, 1, 0],
    ]);
    expect(adjacency.matrix?.labels).toEqual(['0', '1', '2']);
    const laplacian = analyze('laplacian', cycleGraph(4), none).matrix?.rows ?? [];
    expect(laplacian.map((row) => row.reduce((sum, value) => sum + value, 0))).toEqual([
      0, 0, 0, 0,
    ]);
    expect(analyze('laplacian', cycleGraph(3, { directed: true }), none).summary).toContain(
      'undirected',
    );
  });

  it('uses edge weights when asked', () => {
    const graph = new GraphBuilder()
      .addVertex(vertexId('a'))
      .addVertex(vertexId('b'))
      .addEdge(vertexId('a'), vertexId('b'), 5)
      .build();
    expect(analyze('adjacency', graph, none).matrix?.rows[0]).toEqual([0, 1]);
    expect(analyze('weighted-adjacency', graph, none).matrix?.rows[0]).toEqual([0, 5]);
  });

  it('counts walks with adjacency powers', () => {
    const squared = analyze('adjacency-power', cycleGraph(4), { ...none, count: 2 });
    expect(squared.matrix?.rows[0]?.[0]).toBe(2);
    expect(squared.summary).toContain('length 2');
    expect(analyze('adjacency-power', cycleGraph(4), none).matrix?.rows[0]?.[0]).toBe(2);
  });

  it('does not render huge matrices', () => {
    const result = analyze('adjacency', completeGraph(41), none);
    expect(result.matrix).toBeUndefined();
    expect(result.summary).toContain('too large');
  });
});
