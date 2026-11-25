import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-sdk/core';
import { decodeGraph6, encodeGraph6 } from './internal/graph6-codec.js';

/** graph6 line for a simple undirected graph (vertices are numbered by insertion order). */
export function toGraph6(graph: Graph): string {
  if (graph.directed) throw new GraphError('graph6 requires an undirected graph');
  if (graph.edges().some((edge) => edge.source === edge.target)) {
    throw new GraphError('graph6 does not support self-loops');
  }
  return encodeGraph6(graph.vertexCount, (from, to) =>
    graph.hasEdge(graph.vertexAt(from), graph.vertexAt(to)),
  );
}

/** Parses one graph6 line (the optional `>>graph6<<` prefix is accepted). */
export function fromGraph6(line: string): Graph {
  const { count, edges } = decodeGraph6(line);
  const builder = new GraphBuilder({ directed: false });
  const names = Array.from({ length: count }, (_, index) => vertexId(String(index)));
  for (const name of names) builder.addVertex(name);
  for (const [from, to] of edges) builder.addEdge(vertexId(String(from)), vertexId(String(to)));
  return builder.build();
}
