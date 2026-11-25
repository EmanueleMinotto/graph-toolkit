import type { Csr } from '@graph-sdk/core';

interface Matching {
  readonly csr: Csr;
  readonly partner: Int32Array;
  readonly distance: Int32Array;
}

const UNREACHED = 2_147_483_647; // Int32 max: distances live in an Int32Array

/** Queues unseen mates of `vertex`'s neighbors; true if a free right vertex is adjacent. */
function layerFrom(matching: Matching, vertex: number, queue: number[]): boolean {
  const { csr, partner, distance } = matching;
  let isAugmentable = false;
  for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
    const mate = partner[csr.targets[slot]!]!;
    isAugmentable ||= mate === -1;
    if (mate === -1 || distance[mate] !== UNREACHED) continue;
    distance[mate] = distance[vertex]! + 1;
    queue.push(mate);
  }
  return isAugmentable;
}

function layer(matching: Matching, left: readonly number[]): boolean {
  const { partner, distance } = matching;
  const queue = left.filter((vertex) => partner[vertex] === -1);
  for (const vertex of left) distance[vertex] = partner[vertex] === -1 ? 0 : UNREACHED;
  let isAugmentable = false;
  for (let head = 0; head < queue.length; head++) {
    isAugmentable = layerFrom(matching, queue[head]!, queue) || isAugmentable;
  }
  return isAugmentable;
}

function augment(matching: Matching, vertex: number): boolean {
  const { csr, partner, distance } = matching;
  for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
    const right = csr.targets[slot]!;
    const mate = partner[right]!;
    if (mate === -1 || (distance[mate] === distance[vertex]! + 1 && augment(matching, mate))) {
      partner[vertex] = right;
      partner[right] = vertex;
      return true;
    }
  }
  distance[vertex] = UNREACHED;
  return false;
}

/** Hopcroft–Karp, O(E·√V). `left` lists one side of the bipartition; returns partner indices. */
export function hopcroftKarp(csr: Csr, vertexCount: number, left: readonly number[]): Int32Array {
  const matching: Matching = {
    csr,
    partner: new Int32Array(vertexCount).fill(-1),
    distance: new Int32Array(vertexCount),
  };
  while (layer(matching, left)) {
    for (const vertex of left) {
      if (matching.partner[vertex] === -1) augment(matching, vertex);
    }
  }
  return matching.partner;
}
