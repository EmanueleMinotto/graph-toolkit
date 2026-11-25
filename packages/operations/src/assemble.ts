import { uniqueEdges } from './internal/dedupe.js';
import { GraphBuilder, type Edge, type Graph, type VertexId } from '@graph-sdk/core';

export function assemble(
  directed: boolean,
  vertices: readonly VertexId[],
  edges: readonly Edge[],
): Graph {
  const builder = new GraphBuilder({ directed });
  for (const vertex of vertices) builder.addVertex(vertex);
  for (const edge of edges) builder.addEdge(edge.source, edge.target, edge.weight);
  return builder.build();
}

/** Like {@link assemble} but silently drops repeated edges (first one wins). */
export function assembleUnique(
  directed: boolean,
  vertices: readonly VertexId[],
  edges: readonly Edge[],
): Graph {
  return assemble(directed, vertices, uniqueEdges(directed, edges));
}
