import type { Csr } from '@graph-toolkit/core';

export interface Residual {
  readonly to: Uint32Array;
  readonly capacity: Float64Array;
  /** Edge ids leaving each vertex; edge `id ^ 1` is the reverse of `id`. */
  readonly adjacency: readonly number[][];
}

export function buildResidual(csr: Csr, vertexCount: number): Residual {
  const arcCount = csr.targets.length;
  const to = new Uint32Array(2 * arcCount);
  const capacity = new Float64Array(2 * arcCount);
  const adjacency = Array.from({ length: vertexCount }, () => [] as number[]);
  for (let vertex = 0; vertex < vertexCount; vertex++) {
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const forward = 2 * slot;
      to[forward] = csr.targets[slot]!;
      to[forward + 1] = vertex;
      capacity[forward] = csr.weights[slot]!;
      adjacency[vertex]!.push(forward);
      adjacency[csr.targets[slot]!]!.push(forward + 1);
    }
  }
  return { to, capacity, adjacency };
}

export interface Terminals {
  readonly source: number;
  readonly sink: number;
}

interface Search {
  readonly parentEdge: Int32Array;
  readonly visited: Uint8Array;
  readonly queue: number[];
}

function explore(residual: Residual, vertex: number, search: Search): void {
  const edges = residual.adjacency[vertex]!;
  for (const edge of edges) {
    const target = residual.to[edge]!;
    if (search.visited[target] === 1 || residual.capacity[edge]! <= 0) continue;
    search.visited[target] = 1;
    search.parentEdge[target] = edge;
    search.queue.push(target);
  }
}

/** BFS for a shortest augmenting path; parent edge per vertex, or an empty array if none. */
function findAugmentingPath(residual: Residual, terminals: Terminals): Int32Array {
  const size = residual.adjacency.length;
  const search: Search = {
    parentEdge: new Int32Array(size).fill(-1),
    visited: new Uint8Array(size),
    queue: [terminals.source],
  };
  search.visited[terminals.source] = 1;
  for (let head = 0; head < search.queue.length && search.visited[terminals.sink] === 0; head++) {
    explore(residual, search.queue[head]!, search);
  }
  return search.visited[terminals.sink] === 1 ? search.parentEdge : new Int32Array(0);
}

function pathEdges(residual: Residual, parentEdge: Int32Array, terminals: Terminals): number[] {
  const edges: number[] = [];
  for (let vertex = terminals.sink; vertex !== terminals.source;) {
    const edge = parentEdge[vertex]!;
    edges.push(edge);
    vertex = residual.to[edge ^ 1]!;
  }
  return edges;
}

function pushFlow(residual: Residual, edges: readonly number[]): number {
  const bottleneck = Math.min(...edges.map((edge) => residual.capacity[edge]!));
  for (const edge of edges) {
    residual.capacity[edge]! -= bottleneck;
    residual.capacity[edge ^ 1]! += bottleneck;
  }
  return bottleneck;
}

/** Edmonds–Karp, O(V·E²). Arc weights are capacities. */
export function edmondsKarp(csr: Csr, vertexCount: number, terminals: Terminals): number {
  const residual = buildResidual(csr, vertexCount);
  let total = 0;
  for (
    let path = findAugmentingPath(residual, terminals);
    path.length > 0;
    path = findAugmentingPath(residual, terminals)
  ) {
    total += pushFlow(residual, pathEdges(residual, path, terminals));
  }
  return total;
}
