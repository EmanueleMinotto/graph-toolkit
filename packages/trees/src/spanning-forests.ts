import { GraphError, type Graph } from '@graph-toolkit/core';
import { boruvkaKernel, primKernel, type IndexEdge } from './internal/spanning.js';
import type { SpanningForest } from './trees.js';

function assertUndirected(graph: Graph, name: string): void {
  if (graph.directed) throw new GraphError(`${name} requires an undirected graph`);
}

function toForest(graph: Graph, edges: readonly IndexEdge[]): SpanningForest {
  return {
    edges: edges.map((edge) => ({
      source: graph.vertexAt(edge.source),
      target: graph.vertexAt(edge.target),
      weight: edge.weight,
    })),
    totalWeight: edges.reduce((total, edge) => total + edge.weight, 0),
  };
}

/** Prim's minimum spanning forest, O(E log V). */
export function primMinimumSpanningForest(graph: Graph): SpanningForest {
  assertUndirected(graph, 'primMinimumSpanningForest');
  return toForest(graph, primKernel(graph.csr, graph.vertexCount));
}

/** Borůvka's minimum spanning forest, O(E log V). */
export function boruvkaMinimumSpanningForest(graph: Graph): SpanningForest {
  assertUndirected(graph, 'boruvkaMinimumSpanningForest');
  const edges = graph.edges().map((edge) => ({
    source: graph.indexOf(edge.source),
    target: graph.indexOf(edge.target),
    weight: edge.weight,
  }));
  return toForest(graph, boruvkaKernel(graph.vertexCount, edges));
}
