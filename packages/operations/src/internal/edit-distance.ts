import type { AbortSignalLike, Csr } from '@graph-sdk/core';

export interface Pair {
  readonly left: Csr;
  readonly right: Csr;
}

/** Presence matrix (`size × size`) of the arcs, padded with isolated dummy vertices. */
function presence(csr: Csr, count: number, size: number): Uint8Array {
  const matrix = new Uint8Array(size * size);

  for (let from = 0; from < count; from++) {
    for (let slot = csr.offsets[from]!; slot < csr.offsets[from + 1]!; slot++) {
      matrix[from * size + csr.targets[slot]!] = 1;
    }
  }

  return matrix;
}

interface Search {
  readonly size: number;
  readonly left: Uint8Array;
  readonly right: Uint8Array;
  readonly isDirected: boolean;
  readonly image: Int32Array;
  readonly used: Uint8Array;
  readonly signal: AbortSignalLike | undefined;
  best: number;
}

/** Edge mismatches created by sending left vertex `vertex` to right vertex `target`. */
function mismatches(search: Search, vertex: number, target: number): number {
  const { size, left, right, image, isDirected } = search;
  let count = left[vertex * size + vertex] === right[target * size + target] ? 0 : 1;

  for (let before = 0; before < vertex; before++) {
    const other = image[before]!;

    count += left[vertex * size + before] === right[target * size + other] ? 0 : 1;

    if (isDirected) {
      count += left[before * size + vertex] === right[other * size + target] ? 0 : 1;
    }
  }

  return count;
}

function extend(search: Search, vertex: number, cost: number): void {
  search.signal?.throwIfAborted();

  if (cost >= search.best) {
    return;
  }

  if (vertex === search.size) {
    search.best = cost;

    return;
  }

  for (let target = 0; target < search.size; target++) {
    if (search.used[target] === 1) {
      continue;
    }

    search.used[target] = 1;
    search.image[vertex] = target;
    extend(search, vertex + 1, cost + mismatches(search, vertex, target));
    search.used[target] = 0;
  }
}

/**
 * Fewest edge insertions and deletions over all bijections between the two graphs padded to the
 * same size (branch and bound, factorial in the worst case).
 */
export function minimumEdgeEdits(
  pair: Pair,
  counts: readonly [number, number],
  options: { readonly isDirected: boolean; readonly signal: AbortSignalLike | undefined },
): number {
  const size = Math.max(...counts);
  const search: Search = {
    size,
    left: presence(pair.left, counts[0], size),
    right: presence(pair.right, counts[1], size),
    isDirected: options.isDirected,
    image: new Int32Array(size),
    used: new Uint8Array(size),
    signal: options.signal,
    best: Infinity,
  };

  extend(search, 0, 0);

  return search.best;
}
