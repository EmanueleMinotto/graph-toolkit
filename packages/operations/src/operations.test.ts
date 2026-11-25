import { GraphError, vertexId } from '@graph-sdk/core';
import { completeGraph, cycleGraph, pathGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import { complement, inducedSubgraph, intersection, transpose, union } from './index.js';

const id = (name: string) => vertexId(name);

describe('operations', () => {
  it('induces subgraphs', () => {
    const sub = inducedSubgraph(cycleGraph(5), [id('0'), id('1'), id('2')]);
    expect(sub.vertexCount).toBe(3);
    expect(sub.edgeCount).toBe(2);
  });

  it('transposes directed graphs and leaves undirected ones alone', () => {
    const path = pathGraph(3, { directed: true });
    const reversed = transpose(path);
    expect(reversed.hasEdge(id('1'), id('0'))).toBe(true);
    expect(reversed.hasEdge(id('0'), id('1'))).toBe(false);
    const undirected = pathGraph(3);
    expect(transpose(undirected)).toBe(undirected);
  });

  it('complements: K_n has none, path P3 gains the missing chord', () => {
    expect(complement(completeGraph(4)).edgeCount).toBe(0);
    const missing = complement(pathGraph(3));
    expect(missing.edges()).toEqual([{ source: id('0'), target: id('2'), weight: 1 }]);
    expect(complement(pathGraph(2, { directed: true })).edgeCount).toBe(1);
  });

  it('complement is an involution on edge counts', () => {
    const graph = cycleGraph(6);
    expect(complement(complement(graph)).edgeCount).toBe(graph.edgeCount);
  });

  it('unions and intersects graphs', () => {
    const left = pathGraph(3);
    const right = cycleGraph(4);
    expect(union(left, right).vertexCount).toBe(4);
    expect(union(left, right).edgeCount).toBe(4);
    expect(union(cycleGraph(4), pathGraph(3)).edgeCount).toBe(4);
    expect(intersection(left, right).edgeCount).toBe(2);
    expect(intersection(cycleGraph(4), pathGraph(3)).vertexCount).toBe(3);
  });

  it('refuses to mix directed and undirected graphs', () => {
    const mixed = [pathGraph(2), pathGraph(2, { directed: true })] as const;
    expect(() => union(...mixed)).toThrow(GraphError);
    expect(() => intersection(...mixed)).toThrow(GraphError);
  });
});
