import type { Graph, VertexId } from '@graph-sdk/core';
import { valueAt } from './internal/access.js';
import { localMoving, renumber } from './internal/community.js';

const DEFAULT_ITERATIONS = 100;

/** Communities by greedy modularity local moving (Louvain phase 1), numbered by first appearance. Deterministic; unweighted, edge direction ignored. */
export function communities(
  graph: Graph,
  maxIterations: number = DEFAULT_ITERATIONS,
): ReadonlyMap<VertexId, number> {
  const groups = renumber(localMoving(graph.csr, graph.vertexCount, maxIterations));

  return new Map(graph.vertices().map((id, index) => [id, valueAt(groups, index)]));
}
