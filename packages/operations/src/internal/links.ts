import { vertexId, type Edge, type VertexId } from '@graph-sdk/core';

const touches = (edge: Edge, vertex: VertexId): boolean =>
  edge.source === vertex || edge.target === vertex;

const sharesEndpoint = (first: Edge, second: Edge): boolean =>
  touches(second, first.source) || touches(second, first.target);

/** Edges of the line graph (one orientation for undirected). */
export function lineEdges(
  edges: readonly Edge[],
  ids: readonly VertexId[],
  isDirected: boolean,
): Edge[] {
  const links: Edge[] = [];

  for (const [first, firstEdge] of edges.entries()) {
    for (const [second, secondEdge] of edges.entries()) {
      const isLinked = isDirected
        ? firstEdge.target === secondEdge.source
        : first < second && sharesEndpoint(firstEdge, secondEdge);

      if (isLinked) {
        links.push({ source: ids[first]!, target: ids[second]!, weight: 1 });
      }
    }
  }

  return links;
}

export const edgeId = (edge: Edge, isDirected: boolean): VertexId =>
  vertexId(`${edge.source}${isDirected ? '->' : '--'}${edge.target}`);
