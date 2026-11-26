import { GraphError, type Graph, type VertexId } from '@graph-sdk/core';
import { mulberry32, walk } from './internal/walk.js';

const DEFAULT_WALKS_PER_VERTEX = 10;
const DEFAULT_LENGTH = 40;

export interface RandomWalkOptions {
  /** Walks started from each vertex. Default 10. */
  readonly walksPerVertex?: number;
  /** Maximum vertices per walk, start included. Default 40. */
  readonly length?: number;
  /** Seed of the deterministic generator. Default 0. */
  readonly seed?: number;
  /** Pick the next vertex proportionally to edge weight instead of uniformly. Default false. */
  readonly isWeighted?: boolean;
}

function assertPositiveInteger(name: string, value: number): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new GraphError(`${name} must be a positive integer, got ${value}`);
  }
}

/**
 * Seeded random walks over outgoing edges, the raw material of DeepWalk/node2vec-style
 * embeddings. A walk ends early at a vertex without outgoing edges. Walks come grouped by start
 * vertex in graph order. Throws {@link GraphError} on a non-positive `walksPerVertex` or `length`.
 */
export function randomWalks(
  graph: Graph,
  options: RandomWalkOptions = {},
): readonly (readonly VertexId[])[] {
  const {
    walksPerVertex = DEFAULT_WALKS_PER_VERTEX,
    length = DEFAULT_LENGTH,
    seed = 0,
    isWeighted = false,
  } = options;

  assertPositiveInteger('walksPerVertex', walksPerVertex);
  assertPositiveInteger('length', length);

  const plan = { length, next: mulberry32(seed), isWeighted };

  return Array.from({ length: graph.vertexCount * walksPerVertex }, (_, index) =>
    walk(graph.csr, Math.floor(index / walksPerVertex), plan).map((vertex) =>
      graph.vertexAt(vertex),
    ),
  );
}
