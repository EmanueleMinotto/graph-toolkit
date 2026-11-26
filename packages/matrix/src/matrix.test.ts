import { GraphBuilder, GraphError, vertexId } from '@graph-sdk/core';
import { completeGraph, cycleGraph, pathGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import { adjacencyMatrix, graphFromAdjacency, laplacianMatrix, Matrix } from './index.js';

describe('Matrix', () => {
  const left = Matrix.fromRows([
    [1, 2],
    [3, 4],
  ]);

  it('reads, multiplies and exposes rows', () => {
    expect(left.get(1, 0)).toBe(3);

    expect(left.multiply(left).toRows()).toEqual([
      [7, 10],
      [15, 22],
    ]);

    expect(Matrix.fromRows([]).rows).toBe(0);
  });

  it('computes powers by squaring', () => {
    expect(left.power(0).toRows()).toEqual([
      [1, 0],
      [0, 1],
    ]);

    expect(left.power(2).toRows()).toEqual(left.multiply(left).toRows());

    expect(left.power(3).toRows()).toEqual([
      [37, 54],
      [81, 118],
    ]);
  });

  it('validates shapes and indices', () => {
    expect(() => new Matrix(2, 2, [1])).toThrow(RangeError);
    expect(() => left.get(2, 0)).toThrow(RangeError);
    expect(() => left.get(0, -1)).toThrow(RangeError);
    expect(() => left.multiply(Matrix.fromRows([[1, 2, 3]]))).toThrow(RangeError);
    expect(() => Matrix.fromRows([[1, 2]]).power(2)).toThrow(GraphError);
  });
});

describe('graph matrices', () => {
  it('sums parallel edges of multigraphs', () => {
    const multi = new GraphBuilder({ allowParallelEdges: true })
      .addVertex(vertexId('x'))
      .addVertex(vertexId('y'))
      .addEdge(vertexId('x'), vertexId('y'), 2)
      .addEdge(vertexId('x'), vertexId('y'), 3)
      .build();

    expect(adjacencyMatrix(multi).get(0, 1)).toBe(2);
    expect(adjacencyMatrix(multi, { isWeighted: true }).get(1, 0)).toBe(5);
  });

  it('builds adjacency matrices and counts walks', () => {
    const triangle = adjacencyMatrix(completeGraph(3));

    expect(triangle.toRows()).toEqual([
      [0, 1, 1],
      [1, 0, 1],
      [1, 1, 0],
    ]);

    expect(triangle.power(3).get(0, 0)).toBe(2);
  });

  it('keeps weights on request', () => {
    const graph = graphFromAdjacency(
      Matrix.fromRows([
        [0, 2.5],
        [0, 0],
      ]),
      { isDirected: true },
    );

    expect(adjacencyMatrix(graph, { isWeighted: true }).get(0, 1)).toBe(2.5);
    expect(adjacencyMatrix(graph).get(0, 1)).toBe(1);
  });

  it('builds a Laplacian whose rows sum to zero', () => {
    const laplacian = laplacianMatrix(pathGraph(3));

    expect(laplacian.toRows()).toEqual([
      [1, -1, 0],
      [-1, 2, -1],
      [0, -1, 1],
    ]);

    expect(() => laplacianMatrix(completeGraph(3, { directed: true }))).toThrow(GraphError);
  });

  it('round-trips undirected graphs through adjacency', () => {
    const cycle = cycleGraph(5);
    const rebuilt = graphFromAdjacency(adjacencyMatrix(cycle));

    expect(rebuilt.edgeCount).toBe(5);
    expect(adjacencyMatrix(rebuilt).toRows()).toEqual(adjacencyMatrix(cycle).toRows());
  });

  it('rejects invalid adjacency matrices', () => {
    expect(() => graphFromAdjacency(Matrix.fromRows([[0, 1]]))).toThrow(GraphError);

    expect(() =>
      graphFromAdjacency(
        Matrix.fromRows([
          [0, 1],
          [0, 0],
        ]),
      ),
    ).toThrow(GraphError);
  });
});
