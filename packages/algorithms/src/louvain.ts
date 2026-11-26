import { GraphError, type Graph, type VertexId } from '@graph-sdk/core';
import { valueAt } from './internal/access.js';
import type { Network } from './internal/centrality.js';
import { leiden as leidenKernel } from './internal/leiden.js';
import {
  louvain as louvainKernel,
  splitDisconnected,
  type LouvainSettings,
} from './internal/louvain.js';

const DEFAULT_ITERATIONS = 100;

export interface LouvainOptions {
  /** Modularity resolution γ > 0: below 1 favors fewer, larger communities, above 1 smaller ones. Default 1. */
  readonly resolution?: number;
  /** Cap on local-moving sweeps per level. Default 100. */
  readonly maxIterations?: number;
}

function validate(graph: Graph, resolution: number): void {
  if (!Number.isFinite(resolution) || resolution <= 0) {
    throw new GraphError('resolution must be a positive finite number');
  }

  if (graph.csr.weights.some((weight) => weight < 0 || !Number.isFinite(weight))) {
    throw new GraphError('weights must be finite and non-negative');
  }
}

function detect(
  graph: Graph,
  options: LouvainOptions,
  kernel: (network: Network, settings: LouvainSettings) => readonly number[],
): ReadonlyMap<VertexId, number> {
  const { resolution = 1, maxIterations = DEFAULT_ITERATIONS } = options;

  validate(graph, resolution);

  const network = { csr: graph.csr, vertexCount: graph.vertexCount, isDirected: graph.directed };
  const labels = kernel(network, { resolution, maxIterations });
  const connected = splitDisconnected(graph.csr, labels);

  return new Map(graph.vertices().map((id, index) => [id, valueAt(connected, index)]));
}

/**
 * Louvain community detection on weighted modularity with a resolution parameter: repeated local
 * moving and aggregation. Edge direction is ignored. Communities are split into connected pieces
 * and numbered by first appearance. Deterministic.
 */
export function louvain(graph: Graph, options: LouvainOptions = {}): ReadonlyMap<VertexId, number> {
  return detect(graph, options, louvainKernel);
}

/**
 * Leiden community detection: like {@link louvain}, but each level refines the communities into
 * well-connected groups before aggregating, which avoids badly connected communities. Same options
 * and output; deterministic (the refinement picks the best merge instead of a random one).
 */
export function leiden(graph: Graph, options: LouvainOptions = {}): ReadonlyMap<VertexId, number> {
  return detect(graph, options, leidenKernel);
}
