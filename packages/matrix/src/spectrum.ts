import { GraphError, type Graph } from '@graph-toolkit/core';
import { adjacencyMatrix, laplacianMatrix, type MatrixOptions } from './graph-matrices.js';
import { isSymmetric } from './internal/dense.js';
import { jacobiEigenvalues } from './internal/jacobi.js';
import type { Matrix } from './matrix.js';

/** Eigenvalues in ascending order of a symmetric matrix (Jacobi method, O(n³) per sweep). */
export function eigenvalues(matrix: Matrix): readonly number[] {
  const data = matrix.toArray();
  if (matrix.rows !== matrix.columns || !isSymmetric(data, matrix.rows)) {
    throw new GraphError('eigenvalues requires a symmetric matrix');
  }
  return jacobiEigenvalues(data, matrix.rows);
}

/** Adjacency spectrum of an undirected graph, ascending. */
export function adjacencySpectrum(graph: Graph, options: MatrixOptions = {}): readonly number[] {
  if (graph.directed) throw new GraphError('adjacencySpectrum requires an undirected graph');
  return eigenvalues(adjacencyMatrix(graph, options));
}

/** Laplacian spectrum of an undirected graph, ascending (smallest is 0). */
export function laplacianSpectrum(graph: Graph, options: MatrixOptions = {}): readonly number[] {
  return eigenvalues(laplacianMatrix(graph, options));
}

/** Fiedler value: second-smallest Laplacian eigenvalue; 0 iff disconnected (0 for < 2 vertices). */
export function algebraicConnectivity(graph: Graph): number {
  return laplacianSpectrum(graph)[1] ?? 0;
}
