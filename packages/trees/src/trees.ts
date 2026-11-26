import { GraphError, type Edge, type Graph } from '@graph-sdk/core';
import { DisjointSet } from '@graph-sdk/math';
import { connectedComponents } from '@graph-sdk/traversal';

export interface SpanningForest {
  readonly edges: readonly Edge[];
  readonly totalWeight: number;
}

/** Kruskal's minimum spanning forest of an undirected graph, O(E log E). */
export function minimumSpanningForest(graph: Graph): SpanningForest {
  if (graph.directed) {
    throw new GraphError('minimumSpanningForest requires an undirected graph');
  }
  const sets = new DisjointSet(graph.vertexCount);
  const edges = graph
    .edges()
    .toSorted((left, right) => left.weight - right.weight)
    .filter((edge) => sets.union(graph.indexOf(edge.source), graph.indexOf(edge.target)));
  return { edges, totalWeight: edges.reduce((total, edge) => total + edge.weight, 0) };
}

/** Whether an undirected graph has no cycles. O(V + E). */
export function isForest(graph: Graph): boolean {
  return graph.edgeCount === graph.vertexCount - connectedComponents(graph).length;
}

/** Whether an undirected graph is connected and acyclic (the empty graph is not a tree). */
export function isTree(graph: Graph): boolean {
  return graph.vertexCount > 0 && isForest(graph) && connectedComponents(graph).length === 1;
}
