import { GraphError, type Graph, type VertexId } from '@graph-toolkit/core';
import { edmondsKarp } from './internal/flow.js';
import { pageRankKernel, rankAt } from './internal/rank.js';

const DEFAULT_DAMPING = 0.85;
const DEFAULT_ITERATIONS = 100;
const DEFAULT_TOLERANCE = 1e-10;

/** Maximum flow from `source` to `sink` on a directed graph whose weights are capacities. */
export function maxFlow(graph: Graph, source: VertexId, sink: VertexId): number {
  if (!graph.directed) throw new GraphError('maxFlow requires a directed graph');
  if (source === sink) throw new GraphError('source and sink must differ');
  if (graph.csr.weights.some((capacity) => capacity < 0)) {
    throw new GraphError('capacities must be non-negative');
  }
  const terminals = { source: graph.indexOf(source), sink: graph.indexOf(sink) };
  return edmondsKarp(graph.csr, graph.vertexCount, terminals);
}

export interface PageRankOptions {
  /** Default 0.85. */
  readonly damping?: number;
  /** Default 100. */
  readonly maxIterations?: number;
  /** L1 convergence threshold, default 1e-10. */
  readonly tolerance?: number;
}

/** PageRank scores (sum to 1). Edge weights are ignored; undirected edges count both ways. */
export function pageRank(
  graph: Graph,
  options: PageRankOptions = {},
): ReadonlyMap<VertexId, number> {
  if (graph.vertexCount === 0) return new Map();
  const {
    damping = DEFAULT_DAMPING,
    maxIterations = DEFAULT_ITERATIONS,
    tolerance = DEFAULT_TOLERANCE,
  } = options;
  const ranks = pageRankKernel(graph.csr, graph.vertexCount, { damping, maxIterations, tolerance });
  return new Map(graph.vertices().map((id) => [id, rankAt(ranks, graph.indexOf(id))]));
}
