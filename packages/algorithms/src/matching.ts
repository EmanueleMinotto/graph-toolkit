import { GraphError, type Graph, type VertexId } from '@graph-toolkit/core';
import { bipartition } from '@graph-toolkit/coloring';
import { valueAt } from './internal/access.js';
import { hopcroftKarp } from './internal/matching.js';

export interface Matching {
  readonly pairs: readonly (readonly [VertexId, VertexId])[];
  readonly size: number;
}

/** Maximum matching of an undirected bipartite graph (Hopcroft–Karp, O(E·√V)). */
export function maximumBipartiteMatching(graph: Graph): Matching {
  const parts = bipartition(graph);
  if (parts === undefined)
    throw new GraphError('maximumBipartiteMatching requires a bipartite graph');
  const left = graph
    .vertices()
    .filter((id) => parts.colors.get(id) === 0)
    .map((id) => graph.indexOf(id));
  const partner = hopcroftKarp(graph.csr, graph.vertexCount, left);
  const pairs = left
    .filter((vertex) => valueAt(partner, vertex) !== -1)
    .map((vertex) => [graph.vertexAt(vertex), graph.vertexAt(valueAt(partner, vertex))] as const);
  return { pairs, size: pairs.length };
}
