import {
  cycleGraph,
  GraphBuilder,
  pathGraph,
  starGraph,
  vertexId,
  type Graph,
} from 'graph-toolkit';
import { describe, expect, it } from 'vitest';
import { analyze } from './analysis.js';

const none = { from: undefined, to: undefined };
const id = vertexId;

const weighted = (): Graph =>
  new GraphBuilder()
    .addVertex(id('a'))
    .addVertex(id('b'))
    .addVertex(id('c'))
    .addEdge(id('a'), id('b'), 1)
    .addEdge(id('b'), id('c'), 2)
    .addEdge(id('a'), id('c'), 5)
    .build();

describe('tree analyses', () => {
  it('finds the same minimum weight with Kruskal, Prim and Borůvka', () => {
    for (const kind of ['mst', 'prim', 'boruvka'] as const) {
      const result = analyze(kind, weighted(), none);
      expect(result.summary).toContain('total weight 3');
      expect(result.edges.size).toBe(2);
    }
  });

  it('roots a tree and reports depth and parent', () => {
    const result = analyze('rooted-tree', pathGraph(4), { from: id('0'), to: undefined });
    expect(result.summary).toBe('Rooted at 0, height 3');
    expect(result.table?.[2]).toEqual(['2', 'depth 2, parent 1']);
    expect(result.colors.get(id('3'))).toBe(3);
    expect(analyze('rooted-tree', pathGraph(4), none).summary).toContain('Pick');
    expect(
      analyze('rooted-tree', cycleGraph(4), { from: id('0'), to: undefined }).summary,
    ).toContain('tree');
  });

  it('finds the lowest common ancestor', () => {
    const result = analyze('lca', starGraph(5), { from: id('2'), to: id('3') });
    expect(result.summary).toBe('Lowest common ancestor of 2 and 3 is 0 (root 0)');
    expect(result.colors.get(id('0'))).toBe(2);
    expect(analyze('lca', starGraph(5), none).summary).toContain('Pick');
    const empty = new GraphBuilder().build();
    expect(analyze('lca', empty, { from: id('x'), to: id('y') }).summary).toBe(
      'The graph is empty.',
    );
  });
});
