import type { Graph, VertexId } from '@graph-toolkit/core';
import { bfsIndices, dfsIndices } from './internal/lazy.js';

/** Lazily yields vertices reachable from `start` in breadth-first order; stop early at will. */
export function bfsIterator(graph: Graph, start: VertexId): IterableIterator<VertexId> {
  return bfsIndices(graph.csr, graph.indexOf(start)).map((index) => graph.vertexAt(index));
}

/** Lazily yields vertices reachable from `start` in depth-first preorder. */
export function dfsIterator(graph: Graph, start: VertexId): IterableIterator<VertexId> {
  return dfsIndices(graph.csr, graph.indexOf(start)).map((index) => graph.vertexAt(index));
}
