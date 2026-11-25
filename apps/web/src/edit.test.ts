import { cycleGraph, pathGraph, vertexId } from 'graph-toolkit';
import { describe, expect, it } from 'vitest';
import { addEdge, addVertex, nextVertexId, removeEdges, removeVertex, setWeight } from './edit.js';

const [zero, one, two] = [vertexId('0'), vertexId('1'), vertexId('2')];

describe('graph editing', () => {
  it('picks the smallest free numeric id', () => {
    expect(nextVertexId(pathGraph(3))).toBe('3');
    expect(nextVertexId(removeVertex(pathGraph(3), one))).toBe('1');
  });

  it('adds vertices and edges without mutating the input', () => {
    const base = pathGraph(3);
    const grown = addEdge(
      addVertex(base, vertexId('x')),
      { source: zero, target: two, weight: 4 },
      false,
    );
    expect([grown.vertexCount, grown.edgeCount]).toEqual([4, 3]);
    expect([base.vertexCount, base.edgeCount]).toEqual([3, 2]);
    expect(grown.neighbors(zero).find((edge) => edge.target === two)?.weight).toBe(4);
  });

  it('rejects duplicate edges unless parallel edges are allowed', () => {
    expect(() => addEdge(pathGraph(3), { source: one, target: zero, weight: 1 }, false)).toThrow(
      'already exists',
    );
    const multi = addEdge(pathGraph(3), { source: one, target: zero, weight: 1 }, true);
    expect(multi.edgeCount).toBe(3);
    expect(removeEdges(multi, { source: zero, target: one }).edgeCount).toBe(1);
  });

  it('removes a vertex with its edges and edits weights in both orientations', () => {
    const cut = removeVertex(cycleGraph(4), zero);
    expect([cut.vertexCount, cut.edgeCount]).toEqual([3, 2]);
    const heavy = setWeight(pathGraph(3), { source: one, target: zero }, 7);
    expect(heavy.edges().map((edge) => edge.weight)).toEqual([7, 1]);
    const directed = setWeight(pathGraph(3, { directed: true }), { source: one, target: zero }, 7);
    expect(directed.edges().map((edge) => edge.weight)).toEqual([1, 1]);
  });
});
