import { GraphError, type Edge, type Graph, type VertexId } from '@graph-sdk/core';
import { minimumArborescence, pick, type Arc } from './internal/arborescence.js';

export interface Arborescence {
  readonly edges: readonly Edge[];
  readonly totalWeight: number;
}

/**
 * Minimum-weight spanning arborescence of a directed graph rooted at `root` (Chu–Liu/Edmonds,
 * O(V·E)): every other vertex gets exactly one incoming edge and is reachable from `root`.
 * Returns `undefined` if some vertex is unreachable. Throws {@link GraphError} on undirected input.
 */
export function minimumSpanningArborescence(
  graph: Graph,
  root: VertexId,
): Arborescence | undefined {
  if (!graph.directed) {
    throw new GraphError('minimumSpanningArborescence requires a directed graph');
  }

  const edges = graph.edges();
  const arcs = edges.map((edge): Arc => ({
    from: graph.indexOf(edge.source),
    to: graph.indexOf(edge.target),
    weight: edge.weight,
  }));
  const indices = minimumArborescence(graph.vertexCount, arcs, graph.indexOf(root));

  if (indices === undefined) {
    return undefined;
  }

  const chosen = pick(edges, indices);

  return { edges: chosen, totalWeight: chosen.reduce((sum, edge) => sum + edge.weight, 0) };
}
