import type { Graph } from '@graph-sdk/core';
import { DisjointSet } from '@graph-sdk/math';
import { topologicalSort } from '@graph-sdk/traversal';

function hasUndirectedCycle(graph: Graph): boolean {
  const sets = new DisjointSet(graph.vertexCount);
  return graph
    .edges()
    .some((edge) => !sets.union(graph.indexOf(edge.source), graph.indexOf(edge.target)));
}

/** Whether the graph contains a cycle (self-loops count). $O(V + E)$ directed, ~$O(E)$ undirected. */
export function hasCycle(graph: Graph): boolean {
  return graph.directed ? topologicalSort(graph) === undefined : hasUndirectedCycle(graph);
}
