import type { Csr } from '@graph-sdk/core';

interface Bfs {
  readonly order: number[];
  readonly distance: Int32Array;
  readonly paths: Float64Array;
  readonly predecessors: number[][];
}

function visit(search: Bfs, csr: Csr, vertex: number): void {
  const { distance, paths, predecessors, order } = search;

  for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
    const next = csr.targets[slot]!;

    if (distance[next] === -1) {
      distance[next] = distance[vertex]! + 1;
      order.push(next);
    }

    if (distance[next] !== distance[vertex]! + 1) {
      continue;
    }

    paths[next]! += paths[vertex]!;
    predecessors[next]!.push(vertex);
  }
}

function bfsPaths(csr: Csr, vertexCount: number, source: number): Bfs {
  const search: Bfs = {
    order: [source],
    distance: new Int32Array(vertexCount).fill(-1),
    paths: new Float64Array(vertexCount),
    predecessors: Array.from({ length: vertexCount }, () => []),
  };

  search.distance[source] = 0;
  search.paths[source] = 1;

  for (let head = 0; head < search.order.length; head++) {
    visit(search, csr, search.order[head]!);
  }

  return search;
}

/** Wasserman–Faust closeness on hop distances, $O(V \cdot (V + E))$. 0 for isolated vertices. */
export function closeness(csr: Csr, vertexCount: number): Float64Array {
  return Float64Array.from({ length: vertexCount }, (_, source) => {
    const { distance } = bfsPaths(csr, vertexCount, source);
    const reached = distance.filter((value) => value > 0);
    const total = reached.reduce((sum, value) => sum + value, 0);

    return total === 0 ? 0 : (reached.length / (vertexCount - 1)) * (reached.length / total);
  });
}

function accumulate(search: Bfs, source: number, scores: Float64Array): void {
  const delta = new Float64Array(scores.length);
  const backwards = search.order.toReversed();

  for (const vertex of backwards) {
    const parents = search.predecessors[vertex]!;

    for (const before of parents) {
      delta[before]! += (search.paths[before]! / search.paths[vertex]!) * (1 + delta[vertex]!);
    }

    if (vertex !== source) {
      scores[vertex]! += delta[vertex]!;
    }
  }
}

export interface Network {
  readonly csr: Csr;
  readonly vertexCount: number;
  readonly isDirected: boolean;
}

/**
 * Brandes betweenness from the given `sources` only, scaled by `V / sources` so that sampling a
 * subset estimates the full score. Undirected pairs are counted once.
 */
export function betweennessFrom(
  { csr, vertexCount, isDirected }: Network,
  sources: readonly number[],
): Float64Array {
  const scores = new Float64Array(vertexCount);

  for (const source of sources) {
    accumulate(bfsPaths(csr, vertexCount, source), source, scores);
  }

  const scale = vertexCount / sources.length / (isDirected ? 1 : 2);

  return scores.map((score) => score * scale);
}

/** Brandes betweenness on hop distances, $O(V \cdot E)$. Undirected pairs are counted once. */
export function betweenness(csr: Csr, vertexCount: number, isDirected: boolean): Float64Array {
  const everyVertex = Array.from({ length: vertexCount }, (_, index) => index);

  return betweennessFrom({ csr, vertexCount, isDirected }, everyVertex);
}
