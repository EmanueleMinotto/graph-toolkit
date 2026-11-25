import { GraphError, type Graph, type VertexId } from '@graph-toolkit/core';
import {
  bipartiteKernel,
  countColors,
  dsaturKernel,
  greedyKernel,
  toColorMap,
} from './internal/color.js';

export interface Coloring {
  readonly colors: ReadonlyMap<VertexId, number>;
  readonly colorCount: number;
}

function assertColorable(graph: Graph): void {
  if (graph.directed) throw new GraphError('Coloring requires an undirected graph');
  if (graph.edges().some((edge) => edge.source === edge.target)) {
    throw new GraphError('A graph with self-loops has no proper coloring');
  }
}

function toColoring(graph: Graph, colors: Int32Array): Coloring {
  return { colors: toColorMap(graph.vertices(), colors), colorCount: countColors(colors) };
}

/**
 * Greedy coloring in `order` (default: Welsh–Powell, highest degree first).
 * Uses at most Δ + 1 colors. Throws {@link GraphError} for directed graphs or self-loops.
 */
export function greedyColoring(graph: Graph, order?: readonly VertexId[]): Coloring {
  assertColorable(graph);
  const sequence = order ?? graph.vertices().toSorted((a, b) => graph.degree(b) - graph.degree(a));
  const indices = sequence.map((id) => graph.indexOf(id));
  return toColoring(graph, greedyKernel(graph.csr, graph.vertexCount, indices));
}

/** DSATUR heuristic, O(V·E); exact on bipartite and cycle graphs. */
export function dsaturColoring(graph: Graph): Coloring {
  assertColorable(graph);
  return toColoring(graph, dsaturKernel(graph.csr, graph.vertexCount));
}

/** Two-coloring when the graph is bipartite, otherwise `undefined`. */
export function bipartition(graph: Graph): Coloring | undefined {
  assertColorable(graph);
  const colors = bipartiteKernel(graph.csr, graph.vertexCount);
  return colors === undefined ? undefined : toColoring(graph, colors);
}

/** Whether no edge joins two vertices of the same color. */
export function isProperColoring(graph: Graph, coloring: Coloring): boolean {
  return graph
    .edges()
    .every((edge) => coloring.colors.get(edge.source) !== coloring.colors.get(edge.target));
}
