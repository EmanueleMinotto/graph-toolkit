import { GraphError, type Graph, type VertexId } from '@graph-toolkit/core';
import { bfsOrder, componentIndices, dfsOrder, kahnOrder } from './internal/search.js';

type Search = (csr: Graph['csr'], start: number, visited: Uint8Array) => readonly number[];

function visit(graph: Graph, start: VertexId, search: Search): readonly VertexId[] {
  const visited = new Uint8Array(graph.vertexCount);
  return search(graph.csr, graph.indexOf(start), visited).map((index) => graph.vertexAt(index));
}

/** Vertices reachable from `start` in breadth-first order. O(V + E). */
export function bfs(graph: Graph, start: VertexId): readonly VertexId[] {
  return visit(graph, start, bfsOrder);
}

/** Vertices reachable from `start` in depth-first preorder (neighbors in insertion order). O(V + E). */
export function dfs(graph: Graph, start: VertexId): readonly VertexId[] {
  return visit(graph, start, dfsOrder);
}

/** Topological order of a directed graph, or `undefined` if it has a cycle. O(V + E). */
export function topologicalSort(graph: Graph): readonly VertexId[] | undefined {
  const order = kahnOrder(graph.csr, graph.vertexCount);
  return order.length < graph.vertexCount ? undefined : order.map((index) => graph.vertexAt(index));
}

/** Connected components of an undirected graph; throws {@link GraphError} if directed. O(V + E). */
export function connectedComponents(graph: Graph): readonly (readonly VertexId[])[] {
  if (graph.directed) throw new GraphError('connectedComponents requires an undirected graph');
  return componentIndices(graph.csr, graph.vertexCount).map((component) =>
    component.map((index) => graph.vertexAt(index)),
  );
}
