import { GraphError, vertexId } from '@graph-toolkit/core';
import {
  completeGraph,
  cycleGraph,
  gridGraph,
  pathGraph,
  starGraph,
} from '@graph-toolkit/generators';
import { describe, expect, it } from 'vitest';
import {
  areIsomorphic,
  cartesianProduct,
  contractEdge,
  lineGraph,
  tensorProduct,
} from './index.js';

const name = (index: number) => vertexId(String(index));

describe('products', () => {
  it('builds grids as Cartesian products of paths', () => {
    const product = cartesianProduct(pathGraph(2), pathGraph(3));
    expect(product.vertexCount).toBe(6);
    expect(product.edgeCount).toBe(7);
    expect(areIsomorphic(product, gridGraph(2, 3))).toBe(true);
    expect(areIsomorphic(cartesianProduct(pathGraph(2), pathGraph(2)), cycleGraph(4))).toBe(true);
  });

  it('builds tensor products', () => {
    expect(tensorProduct(completeGraph(2), completeGraph(2)).edgeCount).toBe(2);
    expect(tensorProduct(completeGraph(3), completeGraph(3)).edgeCount).toBe(18);
    const directed = tensorProduct(
      pathGraph(2, { directed: true }),
      pathGraph(2, { directed: true }),
    );
    expect(directed.edgeCount).toBe(1);
  });

  it('rejects mixing directed and undirected', () => {
    expect(() => cartesianProduct(pathGraph(2), pathGraph(2, { directed: true }))).toThrow(
      GraphError,
    );
    expect(() => tensorProduct(pathGraph(2), pathGraph(2, { directed: true }))).toThrow(GraphError);
  });
});

describe('lineGraph', () => {
  it('maps paths, triangles and stars', () => {
    expect(areIsomorphic(lineGraph(pathGraph(4)), pathGraph(3))).toBe(true);
    expect(areIsomorphic(lineGraph(completeGraph(3)), completeGraph(3))).toBe(true);
    expect(areIsomorphic(lineGraph(starGraph(5)), completeGraph(4))).toBe(true);
  });

  it('follows arc direction', () => {
    const line = lineGraph(pathGraph(3, { directed: true }));
    expect(line.edges()).toEqual([{ source: '0->1', target: '1->2', weight: 1 }]);
  });
});

describe('contractEdge', () => {
  it('shrinks cycles and merges parallel edges', () => {
    expect(areIsomorphic(contractEdge(cycleGraph(4), name(0), name(1)), cycleGraph(3))).toBe(true);
    expect(contractEdge(completeGraph(3), name(0), name(1)).edgeCount).toBe(1);
  });

  it('handles reversed duplicates after renaming', () => {
    expect(contractEdge(completeGraph(3), name(2), name(0)).edgeCount).toBe(1);
  });

  it('requires an existing edge', () => {
    expect(() => contractEdge(pathGraph(3), name(0), name(2))).toThrow(GraphError);
  });
});
