import { GraphError, type Graph, type VertexId } from '@graph-sdk/core';
import {
  edgeKeyOf,
  kruskal,
  prune,
  shortestPaths,
  terminalTree,
  usedEdgeKeys,
} from './internal/steiner.js';
import type { SpanningForest } from './trees.js';

function assertSupported(graph: Graph): void {
  if (graph.directed) {
    throw new GraphError('steinerTree requires an undirected graph');
  }

  if (graph.csr.weights.some((weight) => weight < 0)) {
    throw new GraphError('weights must be non-negative');
  }
}

/**
 * Steiner tree heuristic (Kou–Markowsky–Berman, at most twice the optimum): a minimum spanning
 * tree over shortest-path distances between `terminals`, expanded into graph edges, re-spanned and
 * pruned. Undirected graphs with non-negative weights; `undefined` if the terminals are not
 * all connected. O(k·(V + E) log V) for k terminals.
 */
export function steinerTree(
  graph: Graph,
  terminals: readonly VertexId[],
): SpanningForest | undefined {
  assertSupported(graph);
  const wanted = [...new Set(terminals)].map((id) => graph.indexOf(id));
  const paths = wanted.map((vertex) => shortestPaths(graph.csr, vertex));
  const links = terminalTree(paths, wanted);

  if (links === undefined) {
    return undefined;
  }

  const used = usedEdgeKeys(paths, wanted, links);
  const index = (id: VertexId): number => graph.indexOf(id);
  const inPaths = graph.edges().filter((edge) => used.has(edgeKeyOf(edge, index)));
  const edges = prune(kruskal(inPaths, index, graph.vertexCount), new Set(terminals));

  return { edges, totalWeight: edges.reduce((sum, edge) => sum + edge.weight, 0) };
}
