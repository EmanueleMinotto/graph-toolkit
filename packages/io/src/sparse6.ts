import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-toolkit/core';
import { decodeSparse6, encodeSparse6 } from './internal/sparse6-codec.js';

/** sparse6 line (`:` prefix) of a simple undirected graph; vertices are numbered by insertion order. */
export function toSparse6(graph: Graph): string {
  if (graph.directed) throw new GraphError('sparse6 requires an undirected graph');
  const pairs = graph
    .edges()
    .map((edge) => [graph.indexOf(edge.source), graph.indexOf(edge.target)] as const);
  return encodeSparse6(graph.vertexCount, pairs);
}

/** Parses one sparse6 line (the optional `>>sparse6<<` prefix is accepted). */
export function fromSparse6(line: string): Graph {
  const { count, edges } = decodeSparse6(line);
  const builder = new GraphBuilder({ directed: false });
  const names = Array.from({ length: count }, (_, index) => vertexId(String(index)));
  for (const name of names) builder.addVertex(name);
  for (const [from, to] of edges) builder.addEdge(vertexId(String(from)), vertexId(String(to)));
  return builder.build();
}
