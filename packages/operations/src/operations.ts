import { type Edge, type Graph, type VertexId } from '@graph-sdk/core';
import { assemble } from './assemble.js';
import { assertSameKind } from './guards.js';

function containsEdge(graph: Graph, edge: Edge): boolean {
  return (
    graph.hasVertex(edge.source) &&
    graph.hasVertex(edge.target) &&
    graph.hasEdge(edge.source, edge.target)
  );
}

/** Subgraph on `keep` (graph order preserved) with every edge between kept vertices. */
export function inducedSubgraph(graph: Graph, keep: readonly VertexId[]): Graph {
  const kept = new Set(keep);
  const vertices = graph.vertices().filter((vertex) => kept.has(vertex));
  const edges = graph.edges().filter((edge) => kept.has(edge.source) && kept.has(edge.target));
  return assemble(graph.directed, vertices, edges);
}

/** Reverses every arc of a directed graph; undirected graphs are returned unchanged. */
export function transpose(graph: Graph): Graph {
  if (!graph.directed) {
    return graph;
  }
  const reversed = graph
    .edges()
    .map((edge): Edge => ({ source: edge.target, target: edge.source, weight: edge.weight }));
  return assemble(true, graph.vertices(), reversed);
}

/** Loop-free complement; new edges get weight 1. O(V² · deg). */
export function complement(graph: Graph): Graph {
  const vertices = graph.vertices();
  const edges = vertices.flatMap((source, row) =>
    vertices
      .filter((_, column) => (graph.directed ? column !== row : column > row))
      .filter((target) => !graph.hasEdge(source, target))
      .map((target): Edge => ({ source, target, weight: 1 })),
  );
  return assemble(graph.directed, vertices, edges);
}

/** Vertices and edges of either graph; weights of `left` win on shared edges. */
export function union(left: Graph, right: Graph): Graph {
  assertSameKind(left, right);
  const vertices = [...left.vertices(), ...right.vertices().filter((id) => !left.hasVertex(id))];
  const edges = [...left.edges(), ...right.edges().filter((edge) => !containsEdge(left, edge))];
  return assemble(left.directed, vertices, edges);
}

/** Vertices and edges present in both graphs; weights come from `left`. */
export function intersection(left: Graph, right: Graph): Graph {
  assertSameKind(left, right);
  const vertices = left.vertices().filter((id) => right.hasVertex(id));
  const edges = left.edges().filter((edge) => containsEdge(right, edge));
  return assemble(left.directed, vertices, edges);
}
