import { GraphError, type Graph, type VertexId } from '@graph-sdk/core';
import { eigenDecomposition, laplacianMatrix, type MatrixOptions } from '@graph-sdk/matrix';
import { coordinates } from './internal/axes.js';

export interface SpectralOptions extends MatrixOptions {
  /** Axes per vertex, `1 <= dimensions < n`. Default 2. */
  readonly dimensions?: number;
}

const DEFAULT_DIMENSIONS = 2;

/**
 * Embeds each vertex with its entries in the Laplacian eigenvectors of the smallest non-trivial
 * eigenvalues (Laplacian eigenmaps). Dense $O(n^3)$: meant for graphs up to a few hundred
 * vertices. Needs an undirected graph; on a disconnected graph or a repeated eigenvalue the
 * eigenvectors are not unique. Throws {@link GraphError} unless `1 <= dimensions < n`.
 */
export function spectralEmbedding(
  graph: Graph,
  options: SpectralOptions = {},
): ReadonlyMap<VertexId, readonly number[]> {
  const { dimensions = DEFAULT_DIMENSIONS, ...matrixOptions } = options;

  if (!Number.isSafeInteger(dimensions) || dimensions < 1 || dimensions >= graph.vertexCount) {
    throw new GraphError(
      `dimensions must be an integer in [1, ${graph.vertexCount - 1}], got ${dimensions}`,
    );
  }

  const { vectors } = eigenDecomposition(laplacianMatrix(graph, matrixOptions));

  return coordinates(graph.vertices(), vectors, dimensions);
}
