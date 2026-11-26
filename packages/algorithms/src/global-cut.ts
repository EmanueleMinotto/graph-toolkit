import { GraphError, type Edge, type Graph, type VertexId } from '@graph-sdk/core';
import { stoerWagner } from './internal/stoer-wagner.js';

export interface GlobalMinCut {
  /** Total weight of the edges crossing the cut (0 when the graph is disconnected). */
  readonly value: number;
  readonly side: readonly VertexId[];
  readonly otherSide: readonly VertexId[];
  /** Edges with one endpoint on each side. */
  readonly edges: readonly Edge[];
}

function validate(graph: Graph): void {
  if (graph.directed) {
    throw new GraphError('globalMinCut requires an undirected graph');
  }

  if (graph.vertexCount < 2) {
    throw new GraphError('globalMinCut needs at least two vertices');
  }

  if (graph.csr.weights.some((weight) => weight < 0)) {
    throw new GraphError('weights must be non-negative');
  }
}

/** Global minimum cut of an undirected graph (Stoer–Wagner, $O(V^3)$); weights are capacities ≥ 0. */
export function globalMinCut(graph: Graph): GlobalMinCut {
  validate(graph);

  const { value, side } = stoerWagner(graph.csr, graph.vertexCount);
  const chosen = new Set(side);
  const onSide = (id: VertexId): boolean => chosen.has(graph.indexOf(id));

  return {
    value,
    side: graph.vertices().filter((id) => onSide(id)),
    otherSide: graph.vertices().filter((id) => !onSide(id)),
    edges: graph.edges().filter((edge) => onSide(edge.source) !== onSide(edge.target)),
  };
}
