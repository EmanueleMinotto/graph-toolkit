import { GraphError, type Graph, type VertexId } from '@graph-sdk/core';
import { yenKernel } from './internal/yen.js';
import type { PathResult } from './astar.js';

export interface KShortestRequest {
  readonly source: VertexId;
  readonly target: VertexId;
  readonly count: number;
}

/** Up to `count` shortest loopless paths from `source` to `target`, cheapest first (Yen). */
export function kShortestPaths(graph: Graph, request: KShortestRequest): readonly PathResult[] {
  if (graph.csr.weights.some((weight) => weight < 0)) {
    throw new GraphError('kShortestPaths requires non-negative weights');
  }

  const endpoints = {
    source: graph.indexOf(request.source),
    target: graph.indexOf(request.target),
  };

  return yenKernel(graph.csr, endpoints, request.count).map((found) => ({
    distance: found.cost,
    path: found.path.map((index) => graph.vertexAt(index)),
  }));
}
