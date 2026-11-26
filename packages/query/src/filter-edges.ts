import { GraphBuilder, type Edge, type Graph } from '@graph-sdk/core';

/** A new graph with every vertex of `graph` (attributes included) and only the edges `keep` accepts. */
export function filterEdges(graph: Graph, keep: (edge: Edge) => boolean): Graph {
  const builder = new GraphBuilder({ directed: graph.directed, allowParallelEdges: true });

  for (const id of graph.vertices()) {
    const attributes = graph.vertexAttributes(id);

    builder.addVertex(id, Object.keys(attributes).length > 0 ? attributes : undefined);
  }

  const kept = graph.edges().filter((edge) => keep(edge));

  for (const { source, target, ...details } of kept) {
    builder.addEdge(source, target, details);
  }

  return builder.build();
}
