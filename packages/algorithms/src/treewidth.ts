import { GraphError, type AbortOptions, type Graph } from '@graph-sdk/core';
import { symmetricSets } from './internal/structure.js';
import { exactTreewidth, largestComponent } from './internal/treewidth.js';

const DEFAULT_MAX_VERTICES = 16;
/** Bitmask arithmetic stays within 31-bit integers. */
const HARD_LIMIT = 24;

export interface TreewidthOptions extends AbortOptions {
  /** Largest connected component accepted, default 16 (hard cap 24). The cost grows like $2^k$. */
  readonly maxVertices?: number;
}

/**
 * Exact treewidth by dynamic programming over vertex subsets, $O(2^k \cdot k^3)$ time and
 * $O(2^k)$ memory for the largest connected component of $k$ vertices; edge directions and loops
 * are ignored. Throws a {@link GraphError} when a component exceeds `maxVertices` — use
 * `treewidthUpperBound` for big graphs. Accepts `{ signal }` to cancel long runs.
 */
export function treewidth(
  graph: Graph,
  { maxVertices = DEFAULT_MAX_VERTICES, signal }: TreewidthOptions = {},
): number {
  const adjacency = symmetricSets(graph.csr, graph.vertexCount);
  const largest = largestComponent(adjacency);

  if (maxVertices > HARD_LIMIT || largest > maxVertices) {
    throw new GraphError(
      `treewidth supports components of at most ${String(Math.min(maxVertices, HARD_LIMIT))} vertices (found ${String(largest)}); use treewidthUpperBound`,
    );
  }

  return exactTreewidth(adjacency, signal);
}
