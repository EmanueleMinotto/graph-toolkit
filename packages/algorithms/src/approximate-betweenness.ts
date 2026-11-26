import { GraphError, type Graph } from '@graph-sdk/core';
import { valueAt } from './internal/access.js';
import { betweennessFrom } from './internal/centrality.js';
import { sampleIndices } from './internal/sampling.js';
import type { Scores } from './centrality.js';

const DEFAULT_SAMPLES = 64;

export interface ApproximateBetweennessOptions {
  /** Number of pivot vertices to search from; default 64. With `samples ≥ V` the result is exact. */
  readonly samples?: number;
  /** Seed of the pivot selection, so results are reproducible; default 0. */
  readonly seed?: number;
}

/**
 * Betweenness estimated from a random sample of pivots (Brandes–Pich), $O(k \cdot E)$ for $k$ pivots.
 * Same scale as {@link betweennessCentrality}; exact when every vertex is a pivot.
 */
export function approximateBetweenness(
  graph: Graph,
  { samples = DEFAULT_SAMPLES, seed = 0 }: ApproximateBetweennessOptions = {},
): Scores {
  if (!Number.isSafeInteger(samples) || samples < 1) {
    throw new GraphError('samples must be a positive integer');
  }

  const pivots = sampleIndices(graph.vertexCount, samples, seed);
  const values = betweennessFrom(
    { csr: graph.csr, vertexCount: graph.vertexCount, isDirected: graph.directed },
    pivots,
  );

  return new Map(graph.vertices().map((id) => [id, valueAt(values, graph.indexOf(id))]));
}
