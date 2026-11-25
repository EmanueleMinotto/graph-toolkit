import type { Graph, VertexId } from '@graph-sdk/core';
import { valueAt } from './internal/access.js';
import { betweenness, closeness } from './internal/centrality.js';

export type Scores = ReadonlyMap<VertexId, number>;

const toScores = (graph: Graph, values: Float64Array): Scores =>
  new Map(graph.vertices().map((id) => [id, valueAt(values, graph.indexOf(id))]));

/** Out-degree divided by V − 1 (0 for a single vertex). */
export function degreeCentrality(graph: Graph): Scores {
  const scale = Math.max(graph.vertexCount - 1, 1);
  return new Map(graph.vertices().map((id) => [id, graph.degree(id) / scale]));
}

/** Wasserman–Faust closeness on hop distances; handles disconnected graphs. */
export function closenessCentrality(graph: Graph): Scores {
  return toScores(graph, closeness(graph.csr, graph.vertexCount));
}

/** Brandes betweenness (unnormalized, hop distances); undirected pairs counted once. */
export function betweennessCentrality(graph: Graph): Scores {
  return toScores(graph, betweenness(graph.csr, graph.vertexCount, graph.directed));
}
