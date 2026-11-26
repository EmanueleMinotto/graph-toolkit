import type { Graph, VertexId } from '@graph-sdk/core';
import type { EdgeListOptions } from './edge-list.js';
import { assembleGraph } from './internal/assemble.js';
import { collectEdges } from './internal/edge-line.js';

/**
 * The lines of {@link toEdgeList}, produced lazily one edge at a time — write them to a file or
 * socket without building one huge string.
 */
export function* toEdgeListLines(graph: Graph): Generator<string> {
  for (const id of graph.vertices()) {
    yield* linesFrom(graph, id);
  }
}

/** Lines of the edges listed under `id` (undirected edges belong to their lower endpoint). */
function* linesFrom(graph: Graph, id: VertexId): Generator<string> {
  const index = graph.indexOf(id);

  for (const edge of graph.neighbors(id)) {
    if (graph.directed || index <= graph.indexOf(edge.target)) {
      yield `${edge.source},${edge.target},${edge.weight}`;
    }
  }
}

/**
 * Parses an edge list that arrives in pieces (a Node stream decoded as text, a decoded `fetch`
 * body, any sync or async iterable of strings). Chunks may split lines anywhere; the text is
 * never held in memory as a whole. Same syntax as {@link fromEdgeList}.
 */
export async function fromEdgeListStream(
  chunks: AsyncIterable<string> | Iterable<string>,
  options: EdgeListOptions = {},
): Promise<Graph> {
  const edges = await collectEdges(chunks);

  return assembleGraph({ directed: options.isDirected ?? false, vertices: [], edges });
}
