import type { Graph } from '@graph-sdk/core';
import { assembleUnique } from './assemble.js';
import { edgeId, lineEdges } from './internal/links.js';

/**
 * Line graph L(G): one vertex per edge (`a--b` / `a->b`). Undirected edges are adjacent when they
 * share an endpoint; directed edge `u→v` points to every edge leaving `v`. O(E²).
 */
export function lineGraph(graph: Graph): Graph {
  const edges = graph.edges();
  const ids = edges.map((edge) => edgeId(edge, graph.directed));

  return assembleUnique(graph.directed, ids, lineEdges(edges, ids, graph.directed));
}
