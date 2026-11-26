import { cycleGraph, GraphBuilder, pathGraph, vertexId, type Graph } from 'graph-toolkit';
import { describe, expect, it } from 'vitest';
import { analyze } from './analysis.js';
import { TOOLS, unavailableReason } from './tools.js';

const none = { from: undefined, to: undefined };
const zero = vertexId('0');

const reasons = (graph: Graph) =>
  TOOLS.filter((tool) => unavailableReason(tool, graph) !== undefined).map((tool) => tool.id);

const dag = () =>
  new GraphBuilder({ directed: true })
    .addVertex(vertexId('a'))
    .addVertex(vertexId('b'))
    .addVertex(vertexId('c'))
    .addEdge(vertexId('a'), vertexId('b'))
    .addEdge(vertexId('b'), vertexId('c'))
    .build();

describe('structure analyses', () => {
  it('runs DFS from a picked vertex', () => {
    expect(analyze('dfs', pathGraph(4), { from: zero, to: undefined }).table).toHaveLength(4);
    expect(analyze('dfs', pathGraph(4), none).summary).toContain('Pick');
  });

  it('colors connected components', () => {
    const split = new GraphBuilder().addVertex(zero).addVertex(vertexId('1')).build();
    const result = analyze('components', split, none);

    expect(result.summary).toBe('2 components');
    expect(new Set(result.colors.values()).size).toBe(2);
    expect(analyze('components', pathGraph(3), none).summary).toBe('1 component');
  });

  it('finds strongly connected components and topological order', () => {
    expect(analyze('scc', dag(), none).summary).toBe('3 strongly connected components');
    expect(analyze('topological', dag(), none).table?.map(([, id]) => id)).toEqual(['a', 'b', 'c']);
    const loop = cycleGraph(3, { directed: true });

    expect(analyze('topological', loop, none).summary).toContain('cycle');
    expect(analyze('scc', loop, none).summary).toBe('1 strongly connected component');
  });

  it('detects cycles, trees and bipartiteness', () => {
    expect(analyze('cycle', cycleGraph(4), none).summary).toBe('Has a cycle.');
    expect(analyze('cycle', pathGraph(4), none).summary).toBe('Acyclic.');
    expect(analyze('tree', pathGraph(4), none).summary).toContain('A tree');
    expect(analyze('tree', cycleGraph(4), none).summary).toContain('not a forest');
    const forest = new GraphBuilder().addVertex(zero).addVertex(vertexId('1')).build();

    expect(analyze('tree', forest, none).summary).toContain('a forest');
    expect(analyze('bipartite', cycleGraph(4), none).colors.size).toBe(4);
    expect(analyze('bipartite', cycleGraph(5), none).summary).toContain('Not bipartite');
  });

  it('reports library errors for the wrong graph kind', () => {
    expect(analyze('components', dag(), none).summary).not.toBe('');
  });

  it('marks tools unavailable on the wrong graph kind', () => {
    expect(reasons(dag())).toContain('components');
    expect(reasons(dag())).not.toContain('scc');
    expect(reasons(pathGraph(3))).toContain('scc');
    expect(reasons(pathGraph(3))).not.toContain('components');
  });
});
