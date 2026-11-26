import type { Csr } from '@graph-sdk/core';

const neighborsOf = (csr: Csr, vertex: number): readonly number[] => [
  ...csr.targets.subarray(csr.offsets[vertex], csr.offsets[vertex + 1]),
];

/** Breadth-first vertex indices from `first`, produced on demand. */
export function* bfsIndices(csr: Csr, first: number): Generator<number, void> {
  const seen = new Uint8Array(csr.offsets.length - 1);
  seen[first] = 1;
  const queue = [first];
  for (let head = 0; head < queue.length; head++) {
    yield queue[head]!;
    const neighbors = neighborsOf(csr, queue[head]!);
    for (const next of neighbors) {
      if (seen[next] === 1) {
        continue;
      }
      seen[next] = 1;
      queue.push(next);
    }
  }
}

/** Depth-first preorder vertex indices from `first`, produced on demand. */
export function* dfsIndices(csr: Csr, first: number): Generator<number, void> {
  const seen = new Uint8Array(csr.offsets.length - 1);
  const stack = [first];
  for (let vertex = stack.pop(); vertex !== undefined; vertex = stack.pop()) {
    if (seen[vertex] === 1) {
      continue;
    }
    seen[vertex] = 1;
    yield vertex;
    stack.push(...neighborsOf(csr, vertex).toReversed());
  }
}
