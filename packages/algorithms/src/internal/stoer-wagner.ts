import type { Csr } from '@graph-sdk/core';

export interface GlobalCut {
  readonly value: number;
  /** Vertex indices on one side of the cheapest cut found. */
  readonly side: readonly number[];
}

/** Symmetric weight matrix; parallel edges add up and self-loops are dropped. */
function weightMatrix(csr: Csr, count: number): Float64Array {
  const matrix = new Float64Array(count * count);

  for (let from = 0; from < count; from++) {
    for (let slot = csr.offsets[from]!; slot < csr.offsets[from + 1]!; slot++) {
      const to = csr.targets[slot]!;

      if (to !== from) {
        matrix[from * count + to]! += csr.weights[slot]!;
      }
    }
  }

  return matrix;
}

interface Phase {
  readonly last: number;
  readonly beforeLast: number;
  /** Weight of the cut separating `last` from everything else (cut-of-the-phase). */
  readonly cut: number;
}

/** The entry with the largest value (first one on ties); the map must not be empty. */
function mostConnected(key: ReadonlyMap<number, number>): readonly [number, number] {
  let best: readonly [number, number] | undefined;

  for (const entry of key) {
    if (best === undefined || entry[1] > best[1]) {
      best = entry;
    }
  }

  return best!;
}

/** One maximum-adjacency ordering over the `active` super-vertices. */
function phase(matrix: Float64Array, count: number, active: readonly number[]): Phase {
  const key = new Map(active.map((vertex) => [vertex, 0]));
  let [last, beforeLast, cut] = [active[0]!, active[0]!, 0];

  while (key.size > 0) {
    const next = mostConnected(key);

    [beforeLast, last, cut] = [last, next[0], next[1]];
    key.delete(last);

    for (const [vertex, value] of key) {
      key.set(vertex, value + matrix[last * count + vertex]!);
    }
  }

  return { last, beforeLast, cut };
}

/** Stoer–Wagner global minimum cut on a dense matrix, $O(V^3)$. Needs at least two vertices. */
export function stoerWagner(csr: Csr, count: number): GlobalCut {
  const matrix = weightMatrix(csr, count);
  const groups = Array.from({ length: count }, (_, vertex) => [vertex]);
  let active = Array.from({ length: count }, (_, vertex) => vertex);
  let best: GlobalCut = { value: Infinity, side: [] };

  while (active.length > 1) {
    const { last, beforeLast, cut } = phase(matrix, count, active);

    if (cut < best.value) {
      best = { value: cut, side: [...groups[last]!] };
    }

    groups[beforeLast]!.push(...groups[last]!);

    for (const vertex of active) {
      matrix[beforeLast * count + vertex]! += matrix[last * count + vertex]!;
      matrix[vertex * count + beforeLast] = matrix[beforeLast * count + vertex]!;
    }

    active = active.filter((vertex) => vertex !== last);
  }

  return best;
}
