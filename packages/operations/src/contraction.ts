import { GraphError, type Edge, type Graph, type VertexId } from '@graph-toolkit/core';
import { assembleUnique } from './assemble.js';

/**
 * Contracts the edge `keep — merge`: `merge` disappears and its edges move to `keep`.
 * Loops are dropped and parallel edges keep the first weight. Throws if the edge is absent.
 */
export function contractEdge(graph: Graph, keep: VertexId, merge: VertexId): Graph {
  if (!graph.hasEdge(keep, merge)) throw new GraphError(`No edge ${keep} — ${merge} to contract`);
  const rename = (id: VertexId): VertexId => (id === merge ? keep : id);
  const edges = graph
    .edges()
    .map((edge): Edge => ({ ...edge, source: rename(edge.source), target: rename(edge.target) }))
    .filter((edge) => edge.source !== edge.target);
  const vertices = graph.vertices().filter((id) => id !== merge);
  return assembleUnique(graph.directed, vertices, edges);
}
