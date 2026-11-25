import type { Edge } from '@graph-toolkit/core';

const keyOf = (edge: Edge, isDirected: boolean): string =>
  isDirected || edge.source < edge.target
    ? `${edge.source}\0${edge.target}`
    : `${edge.target}\0${edge.source}`;

/** Drops repeated edges, keeping the first occurrence. */
export function uniqueEdges(isDirected: boolean, edges: readonly Edge[]): Edge[] {
  const seen = new Set<string>();
  return edges.filter((edge) => {
    const key = keyOf(edge, isDirected);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
