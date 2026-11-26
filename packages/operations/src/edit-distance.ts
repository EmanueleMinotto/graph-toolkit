import { GraphError, type AbortOptions, type Graph } from '@graph-sdk/core';
import { minimumEdgeEdits } from './internal/edit-distance.js';

const DEFAULT_MAX_VERTICES = 8;

export interface EditDistanceOptions extends AbortOptions {
  /** Cost of inserting or deleting a vertex. Default 1. */
  readonly vertexCost?: number;
  /** Cost of inserting or deleting an edge. Default 1. */
  readonly edgeCost?: number;
  /** Largest graph accepted, default 8 — the search is factorial. */
  readonly maxVertices?: number;
}

const isInvalidCost = (value: number): boolean => !Number.isFinite(value) || value < 0;

type Settings = Required<Pick<EditDistanceOptions, 'vertexCost' | 'edgeCost' | 'maxVertices'>>;

function validate(left: Graph, right: Graph, options: Settings): void {
  const { vertexCost, edgeCost, maxVertices } = options;

  if (left.directed !== right.directed) {
    throw new GraphError('graphs must be both directed or both undirected');
  }

  if (isInvalidCost(vertexCost) || isInvalidCost(edgeCost)) {
    throw new GraphError('costs must be finite and non-negative');
  }

  if (Math.max(left.vertexCount, right.vertexCount) > maxVertices) {
    throw new GraphError(`graphEditDistance supports at most ${String(maxVertices)} vertices`);
  }
}

/**
 * Exact graph edit distance between two graphs of the same kind: the cheapest sequence of vertex
 * and edge insertions and deletions turning one into the other, up to renaming of vertices
 * (vertex identifiers are not compared; weights and parallel edges are ignored).
 * Branch and bound, factorial in the worst case — keep graphs small. Accepts `{ signal }`.
 */
export function graphEditDistance(
  left: Graph,
  right: Graph,
  options: EditDistanceOptions = {},
): number {
  const { vertexCost = 1, edgeCost = 1, maxVertices = DEFAULT_MAX_VERTICES, signal } = options;

  validate(left, right, { vertexCost, edgeCost, maxVertices });

  const edgeEdits = minimumEdgeEdits(
    { left: left.csr, right: right.csr },
    [left.vertexCount, right.vertexCount],
    { isDirected: left.directed, signal },
  );
  const vertexEdits = Math.abs(left.vertexCount - right.vertexCount);

  return vertexEdits * vertexCost + edgeEdits * edgeCost;
}
