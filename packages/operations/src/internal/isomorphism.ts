import type { AbortSignalLike, Csr } from '@graph-sdk/core';

interface Side {
  readonly size: number;
  readonly matrix: Uint8Array;
  readonly outDegree: Int32Array;
  readonly inDegree: Int32Array;
}

function sideOf(csr: Csr, size: number): Side {
  const matrix = new Uint8Array(size * size);
  const outDegree = new Int32Array(size);
  const inDegree = new Int32Array(size);

  for (let vertex = 0; vertex < size; vertex++) {
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const target = csr.targets[slot]!;

      matrix[vertex * size + target] = 1;
      outDegree[vertex]!++;
      inDegree[target]!++;
    }
  }

  return { size, matrix, outDegree, inDegree };
}

interface Search {
  readonly left: Side;
  readonly right: Side;
  readonly order: readonly number[];
  readonly image: Int32Array;
  readonly isUsed: Uint8Array;
  readonly signal: AbortSignalLike | undefined;
}

function degreesMatch(search: Search, vertex: number, candidate: number): boolean {
  const { left, right } = search;

  return (
    left.outDegree[vertex] === right.outDegree[candidate] &&
    left.inDegree[vertex] === right.inDegree[candidate] &&
    left.matrix[vertex * left.size + vertex] === right.matrix[candidate * right.size + candidate]
  );
}

function agreesWithEarlier(search: Search, depth: number, candidate: number): boolean {
  const { left, right, order, image } = search;
  const vertex = order[depth]!;

  for (let earlier = 0; earlier < depth; earlier++) {
    const [other, mapped] = [order[earlier]!, image[order[earlier]!]!];
    const forward =
      left.matrix[vertex * left.size + other] === right.matrix[candidate * right.size + mapped];
    const backward =
      left.matrix[other * left.size + vertex] === right.matrix[mapped * right.size + candidate];

    if (!forward || !backward) {
      return false;
    }
  }

  return true;
}

function isConsistent(search: Search, depth: number, candidate: number): boolean {
  return (
    degreesMatch(search, search.order[depth]!, candidate) &&
    agreesWithEarlier(search, depth, candidate)
  );
}

function step(search: Search, depth: number): boolean {
  if (depth === search.order.length) {
    return true;
  }

  for (let candidate = 0; candidate < search.right.size; candidate++) {
    if (search.isUsed[candidate] === 1 || !isConsistent(search, depth, candidate)) {
      continue;
    }

    search.image[search.order[depth]!] = candidate;
    search.isUsed[candidate] = 1;

    if (extend(search, depth + 1)) {
      return true;
    }

    search.isUsed[candidate] = 0;
  }

  return false;
}

function extend(search: Search, depth: number): boolean {
  search.signal?.throwIfAborted();

  return step(search, depth);
}

/**
 * Backtracking isomorphism test (degrees + adjacency, weights ignored); exponential worst case.
 * Returns the vertex-index mapping left → right, or `undefined`.
 */
export function findIsomorphism(
  graphs: readonly [left: Csr, right: Csr],
  size: number,
  signal?: AbortSignalLike,
): Int32Array | undefined {
  const [left, right] = [sideOf(graphs[0], size), sideOf(graphs[1], size)];
  const order = Array.from({ length: size }, (_, vertex) => vertex).toSorted(
    (a, b) => left.outDegree[b]! + left.inDegree[b]! - left.outDegree[a]! - left.inDegree[a]!,
  );
  const search: Search = {
    left,
    right,
    order,
    image: new Int32Array(size),
    isUsed: new Uint8Array(size),
    signal,
  };

  return extend(search, 0) ? search.image : undefined;
}

export function imageOf(image: Int32Array, index: number): number {
  return image[index]!;
}
