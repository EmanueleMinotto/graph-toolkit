import type { Graph, VertexId } from '@graph-toolkit/core';
import { findIsomorphism, imageOf } from './internal/isomorphism.js';

/**
 * A bijection `left → right` preserving adjacency (edge weights are ignored), or `undefined`.
 * Backtracking: fast on typical graphs, exponential in the worst case.
 */
export function findGraphIsomorphism(
  left: Graph,
  right: Graph,
): ReadonlyMap<VertexId, VertexId> | undefined {
  const isComparable =
    left.directed === right.directed &&
    left.vertexCount === right.vertexCount &&
    left.edgeCount === right.edgeCount;
  const image = isComparable ? findIsomorphism([left.csr, right.csr], left.vertexCount) : undefined;
  return image === undefined
    ? undefined
    : new Map(left.vertices().map((id, index) => [id, right.vertexAt(imageOf(image, index))]));
}

export function areIsomorphic(left: Graph, right: Graph): boolean {
  return findGraphIsomorphism(left, right) !== undefined;
}
