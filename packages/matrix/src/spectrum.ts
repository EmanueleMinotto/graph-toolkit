import { GraphError, type Graph } from '@graph-sdk/core';
import { adjacencyMatrix, laplacianMatrix, type MatrixOptions } from './graph-matrices.js';
import { isSymmetric } from './internal/dense.js';
import { jacobiEigen, jacobiEigenvalues, type Eigen } from './internal/jacobi.js';
import type { Matrix } from './matrix.js';

function assertSymmetric(matrix: Matrix): void {
  if (matrix.rows !== matrix.columns || !isSymmetric(matrix.toArray(), matrix.rows)) {
    throw new GraphError('eigenvalues requires a symmetric matrix');
  }
}

/** Eigenvalues in ascending order of a symmetric matrix (Jacobi method, O(n³) per sweep). */
export function eigenvalues(matrix: Matrix): readonly number[] {
  assertSymmetric(matrix);
  return jacobiEigenvalues(matrix.toArray(), matrix.rows);
}

/** Eigenvalues (ascending) with their unit eigenvectors, for a symmetric matrix. */
export function eigenDecomposition(matrix: Matrix): Eigen {
  assertSymmetric(matrix);
  return jacobiEigen(matrix.toArray(), matrix.rows);
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
