import {
  GraphBuilder,
  GraphError,
  vertexId,
  type Edge,
  type Graph,
  type VertexId,
} from '@graph-sdk/core';

const compare = (left: string, right: string): number =>
  Number(left > right) - Number(left < right);

function assemble(graph: Graph, vertices: readonly VertexId[], edges: readonly Edge[]): Graph {
  const builder = new GraphBuilder({ directed: graph.directed });
  for (const vertex of vertices) {
    builder.addVertex(vertex);
  }
  for (const edge of edges) {
    builder.addEdge(edge.source, edge.target, edge.weight);
  }
  return builder.build();
}

/** Applies `rename` to every vertex id. Throws {@link GraphError} if two ids collide. */
export function relabel(graph: Graph, rename: (id: VertexId) => VertexId): Graph {
  const names = graph.vertices().map((id) => rename(id));
  if (new Set(names).size !== names.length) {
    throw new GraphError('relabel produced duplicate ids');
  }
  const edges = graph.edges().map((edge): Edge => ({
    source: rename(edge.source),
    target: rename(edge.target),
    weight: edge.weight,
  }));
  return assemble(graph, names, edges);
}

/** Drops loops (`v → v`). */
export function removeSelfLoops(graph: Graph): Graph {
  const edges = graph.edges().filter((edge) => edge.source !== edge.target);
  return assemble(graph, graph.vertices(), edges);
}

function orientedEdge(graph: Graph, edge: Edge): Edge {
  const isSwapped = !graph.directed && compare(edge.source, edge.target) > 0;
  return isSwapped ? { ...edge, source: edge.target, target: edge.source } : edge;
}

/**
 * Canonical form: vertices sorted by id, undirected endpoints ordered, edges sorted by
 * (source, target). Equal graphs (same ids, edges, weights) serialize identically.
 */
export function canonicalize(graph: Graph): Graph {
  const vertices = graph.vertices().toSorted(compare);
  const edges = graph
    .edges()
    .map((edge) => orientedEdge(graph, edge))
    .toSorted((a, b) => compare(a.source, b.source) || compare(a.target, b.target));
  return assemble(graph, vertices, edges);
}

/** Renames vertices to `"0"`..`"n-1"` in current vertex order. */
export function reindex(graph: Graph): Graph {
  return relabel(graph, (id) => vertexId(String(graph.indexOf(id))));
}
