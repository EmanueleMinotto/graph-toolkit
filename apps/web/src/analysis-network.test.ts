import {
  completeGraph,
  cycleGraph,
  GraphBuilder,
  pathGraph,
  starGraph,
  vertexId,
  type Graph,
} from 'graph-toolkit';
import { describe, expect, it } from 'vitest';
import { analyze } from './analysis.js';

const id = vertexId;
const none = { from: undefined, to: undefined };

const network = (): Graph =>
  new GraphBuilder({ directed: true })
    .addVertex(id('s'))
    .addVertex(id('a'))
    .addVertex(id('t'))
    .addEdge(id('s'), id('a'), 3)
    .addEdge(id('a'), id('t'), 2)
    .addEdge(id('s'), id('t'), 1)
    .build();

describe('network analyses', () => {
  it('computes the maximum flow with both algorithms', () => {
    for (const kind of ['max-flow', 'max-flow-dinic'] as const) {
      const result = analyze(kind, network(), { from: id('s'), to: id('t') });
      expect(result.summary).toContain('= 3');
    }
    expect(analyze('max-flow', network(), none).summary).toContain('Pick');
    expect(analyze('max-flow', pathGraph(3), { from: id('0'), to: id('2') }).summary).toContain(
      'directed',
    );
  });

  it('finds a maximum bipartite matching', () => {
    const result = analyze('matching', pathGraph(4), none);
    expect(result.summary).toBe('Maximum matching of size 2');
    expect(result.edges.size).toBe(2);
    expect(analyze('matching', cycleGraph(3), none).summary).toContain('bipartite');
  });

  it('ranks vertices and sizes them by score', () => {
    for (const kind of ['pagerank', 'degree', 'closeness', 'betweenness'] as const) {
      const result = analyze(kind, starGraph(5), none);
      expect(result.summary).toContain('highest is 0');
      expect(result.sizes?.get(id('0'))).toBe(1);
      expect(result.table?.[0]?.[0]).toBe('0');
    }
    expect(analyze('degree', new GraphBuilder().build(), none).summary).toContain('empty');
    const flat = analyze('degree', new GraphBuilder().addVertex(id('x')).build(), none);
    expect(flat.sizes?.get(id('x'))).toBe(0);
  });

  it('honors the PageRank damping factor', () => {
    const base = analyze('pagerank', starGraph(6), { ...none, count: 0.5 }).table;
    const high = analyze('pagerank', starGraph(6), { ...none, count: 0.95 }).table;
    expect(base?.[0]?.[1]).not.toBe(high?.[0]?.[1]);
  });

  it('detects communities, cliques and planarity', () => {
    const twoTriangles = new GraphBuilder()
      .addVertex(id('a'))
      .addVertex(id('b'))
      .addVertex(id('c'))
      .addVertex(id('d'))
      .addVertex(id('e'))
      .addVertex(id('f'))
      .addEdge(id('a'), id('b'))
      .addEdge(id('b'), id('c'))
      .addEdge(id('a'), id('c'))
      .addEdge(id('d'), id('e'))
      .addEdge(id('e'), id('f'))
      .addEdge(id('d'), id('f'))
      .addEdge(id('c'), id('d'))
      .build();
    expect(analyze('communities', twoTriangles, { ...none, count: 50 }).summary).toBe(
      '2 communities',
    );
    expect(analyze('maximal-cliques', twoTriangles, none).summary).toBe('3 maximal cliques');
    const biggest = analyze('maximum-clique', completeGraph(5), none);
    expect(biggest.summary).toBe('Maximum clique of size 5');
    expect(biggest.edges.size).toBe(10);
    expect(analyze('planar', completeGraph(4), none).summary).toBe('Planar.');
    expect(analyze('planar', completeGraph(5), none).summary).toBe('Not planar.');
  });
});
