import { GraphBuilder, GraphError, vertexId } from '@graph-toolkit/core';
import { completeGraph, cycleGraph, pathGraph } from '@graph-toolkit/generators';
import { describe, expect, it } from 'vitest';
import {
  adjacencySpectrum,
  algebraicConnectivity,
  eigenvalues,
  incidenceMatrix,
  laplacianSpectrum,
  Matrix,
} from './index.js';

describe('spectrum', () => {
  it('computes known eigenvalues', () => {
    const values = eigenvalues(
      Matrix.fromRows([
        [2, 1],
        [1, 2],
      ]),
    );
    expect(values[0]).toBeCloseTo(1);
    expect(values[1]).toBeCloseTo(3);
    expect(adjacencySpectrum(completeGraph(4))[3]).toBeCloseTo(3);
    expect(adjacencySpectrum(completeGraph(4))[0]).toBeCloseTo(-1);
  });

  it('handles diagonal matrices (no rotation needed) and empty ones', () => {
    expect(
      eigenvalues(
        Matrix.fromRows([
          [3, 0],
          [0, 1],
        ]),
      ),
    ).toEqual([1, 3]);
    expect(eigenvalues(new Matrix(0, 0, []))).toEqual([]);
  });

  it('computes the Laplacian spectrum and Fiedler value', () => {
    expect(laplacianSpectrum(cycleGraph(4))[0]).toBeCloseTo(0);
    expect(algebraicConnectivity(cycleGraph(4))).toBeCloseTo(2);
    expect(algebraicConnectivity(pathGraph(1))).toBe(0);
    const builder = new GraphBuilder({ directed: false });
    builder.addVertex(vertexId('a')).addVertex(vertexId('b'));
    expect(algebraicConnectivity(builder.build())).toBeCloseTo(0);
  });

  it('rejects non-symmetric input and directed graphs', () => {
    expect(() =>
      eigenvalues(
        Matrix.fromRows([
          [0, 1],
          [0, 0],
        ]),
      ),
    ).toThrow(GraphError);
    expect(() => eigenvalues(Matrix.fromRows([[0, 1, 0]]))).toThrow(GraphError);
    expect(() => adjacencySpectrum(completeGraph(3, { directed: true }))).toThrow(GraphError);
  });
});

describe('incidenceMatrix', () => {
  it('has one column per edge', () => {
    expect(incidenceMatrix(pathGraph(3)).toRows()).toEqual([
      [1, 0],
      [1, 1],
      [0, 1],
    ]);
  });

  it('signs directed arcs', () => {
    expect(incidenceMatrix(pathGraph(2, { directed: true })).toRows()).toEqual([[-1], [1]]);
  });
});
