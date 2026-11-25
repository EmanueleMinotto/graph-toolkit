import { GraphError, type Graph, type VertexId } from '@graph-sdk/core';
import { restrictedDijkstra, type IndexPath } from './internal/restricted.js';

export interface PathResult {
  readonly distance: number;
  readonly path: readonly VertexId[];
}

const toResult = (graph: Graph, found: IndexPath): PathResult => ({
  distance: found.cost,
  path: found.path.map((index) => graph.vertexAt(index)),
});

export interface AStarRequest {
  readonly source: VertexId;
  readonly target: VertexId;
  readonly heuristic: (vertex: VertexId) => number;
}

/**
 * A* search. `heuristic(v)` must never overestimate the remaining distance and be consistent.
 * Returns `undefined` when `target` is unreachable. Non-negative weights only.
 */
export function aStar(graph: Graph, request: AStarRequest): PathResult | undefined {
  if (graph.csr.weights.some((weight) => weight < 0))
    throw new GraphError('aStar requires non-negative weights');
  const endpoints = {
    source: graph.indexOf(request.source),
    target: graph.indexOf(request.target),
  };
  const found = restrictedDijkstra(graph.csr, endpoints, {
    blockedSlots: new Set(),
    blockedVertices: new Set(),
    heuristic: (index) => request.heuristic(graph.vertexAt(index)),
  });
  return found === undefined ? undefined : toResult(graph, found);
}
