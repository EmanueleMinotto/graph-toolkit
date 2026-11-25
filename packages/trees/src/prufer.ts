import { GraphBuilder, GraphError, type Graph, type VertexId } from '@graph-toolkit/core';
import { decodePrufer, encodePrufer, itemAt } from './internal/prufer.js';
import { isTree } from './trees.js';

/** Prüfer sequence (n − 2 vertex ids) of an undirected tree with at least 2 vertices. */
export function pruferCode(tree: Graph): readonly VertexId[] {
  if (tree.directed || tree.vertexCount < 2 || !isTree(tree)) {
    throw new GraphError('pruferCode requires an undirected tree with at least 2 vertices');
  }
  const edges = tree.edges().map((edge) => ({
    source: tree.indexOf(edge.source),
    target: tree.indexOf(edge.target),
    weight: edge.weight,
  }));
  return encodePrufer(tree.vertexCount, edges).map((index) => tree.vertexAt(index));
}

/** Rebuilds the tree on `vertices` (in order) from its Prüfer `code`. */
export function treeFromPruferCode(
  vertices: readonly VertexId[],
  code: readonly VertexId[],
): Graph {
  const indices = code.map((id) => vertices.indexOf(id));
  if (vertices.length !== code.length + 2 || indices.includes(-1)) {
    throw new GraphError('code must have vertices.length - 2 entries, all from vertices');
  }
  const builder = new GraphBuilder();
  for (const vertex of vertices) builder.addVertex(vertex);
  for (const [from, to] of decodePrufer(indices)) {
    builder.addEdge(itemAt(vertices, from), itemAt(vertices, to));
  }
  return builder.build();
}
