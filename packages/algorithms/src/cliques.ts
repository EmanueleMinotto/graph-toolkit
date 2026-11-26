import { GraphError, type AbortOptions, type Graph, type VertexId } from '@graph-sdk/core';
import { maximalCliqueKernel } from './internal/cliques.js';

/** All maximal cliques of an undirected graph (Bron–Kerbosch with pivoting). */
export function maximalCliques(
  graph: Graph,
  options: AbortOptions = {},
): readonly (readonly VertexId[])[] {
  if (graph.directed) {
    throw new GraphError('maximalCliques requires an undirected graph');
  }
  return maximalCliqueKernel(graph.csr, graph.vertexCount, options.signal).map((clique) =>
    clique.map((index) => graph.vertexAt(index)),
  );
}

/** A largest clique (first found among the maximum-size ones); empty for the empty graph. */
export function maximumClique(graph: Graph, options: AbortOptions = {}): readonly VertexId[] {
  const bySize = maximalCliques(graph, options).toSorted(
    (left, right) => right.length - left.length,
  );
  return bySize[0] ?? [];
}
