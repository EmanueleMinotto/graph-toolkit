import { GraphError, type Edge, type Graph, type VertexId } from '@graph-sdk/core';
import { dinicKernel } from './internal/dinic.js';
import { edmondsKarp, sourceSide, type Terminals } from './internal/flow.js';
import { pageRankKernel, rankAt } from './internal/rank.js';

export interface MinCut {
  /** Total capacity of the cut, equal to the maximum flow. */
  readonly value: number;
  readonly sourceSide: readonly VertexId[];
  readonly sinkSide: readonly VertexId[];
  /** Edges going from the source side to the sink side. */
  readonly edges: readonly Edge[];
}

/** Minimum s–t cut (max-flow min-cut theorem); same contract as {@link maxFlow}. */
export function minCut(graph: Graph, source: VertexId, sink: VertexId): MinCut {
  const terminals = terminalsOf(graph, source, sink);
  const reached = sourceSide(graph.csr, graph.vertexCount, terminals);
  const onSource = (id: VertexId): boolean => reached[graph.indexOf(id)] === 1;
  const edges = graph.edges().filter((edge) => onSource(edge.source) && !onSource(edge.target));
  return {
    value: edges.reduce((sum, edge) => sum + edge.weight, 0),
    sourceSide: graph.vertices().filter((id) => onSource(id)),
    sinkSide: graph.vertices().filter((id) => !onSource(id)),
    edges,
  };
}

const DEFAULT_DAMPING = 0.85;
const DEFAULT_ITERATIONS = 100;
const DEFAULT_TOLERANCE = 1e-10;

function terminalsOf(graph: Graph, source: VertexId, sink: VertexId): Terminals {
  if (!graph.directed) {
    throw new GraphError('maxFlow requires a directed graph');
  }
  if (source === sink) {
    throw new GraphError('source and sink must differ');
  }
  if (graph.csr.weights.some((capacity) => capacity < 0)) {
    throw new GraphError('capacities must be non-negative');
  }
  return { source: graph.indexOf(source), sink: graph.indexOf(sink) };
}

/** Maximum flow (Edmonds–Karp, O(V·E²)); directed graph, weights are capacities ≥ 0. */
export function maxFlow(graph: Graph, source: VertexId, sink: VertexId): number {
  return edmondsKarp(graph.csr, graph.vertexCount, terminalsOf(graph, source, sink));
}

/** Maximum flow with Dinic's algorithm, O(V²·E); same contract as {@link maxFlow}. */
export function maxFlowDinic(graph: Graph, source: VertexId, sink: VertexId): number {
  return dinicKernel(graph.csr, graph.vertexCount, terminalsOf(graph, source, sink));
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
  if (graph.vertexCount === 0) {
    return new Map();
  }
  const {
    damping = DEFAULT_DAMPING,
    maxIterations = DEFAULT_ITERATIONS,
    tolerance = DEFAULT_TOLERANCE,
  } = options;
  const ranks = pageRankKernel(graph.csr, graph.vertexCount, { damping, maxIterations, tolerance });
  return new Map(graph.vertices().map((id) => [id, rankAt(ranks, graph.indexOf(id))]));
}
