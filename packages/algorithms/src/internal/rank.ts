import type { Csr } from '@graph-sdk/core';

export interface RankOptions {
  readonly damping: number;
  readonly maxIterations: number;
  readonly tolerance: number;
}

function step(csr: Csr, ranks: Float64Array, damping: number): Float64Array {
  const count = ranks.length;
  const next = new Float64Array(count);
  let dangling = 0;

  for (let vertex = 0; vertex < count; vertex++) {
    const start = csr.offsets[vertex]!;
    const end = csr.offsets[vertex + 1]!;

    if (start === end) {
      dangling += ranks[vertex]!;
    }

    for (let slot = start; slot < end; slot++) {
      next[csr.targets[slot]!]! += (damping * ranks[vertex]!) / (end - start);
    }
  }

  const base = (1 - damping + damping * dangling) / count;

  return next.map((value) => value + base);
}

function distance(left: Float64Array, right: Float64Array): number {
  return left.reduce((total, value, index) => total + Math.abs(value - right[index]!), 0);
}

/** Power iteration; ranks sum to 1. Dangling vertices spread their rank uniformly. */
export function pageRankKernel(csr: Csr, count: number, options: RankOptions): Float64Array {
  let ranks: Float64Array = new Float64Array(count).fill(1 / count);

  for (let iteration = 0; iteration < options.maxIterations; iteration++) {
    const next = step(csr, ranks, options.damping);
    const converged = distance(ranks, next) < options.tolerance;

    ranks = next;

    if (converged) {
      break;
    }
  }

  return ranks;
}

export function rankAt(ranks: Float64Array, index: number): number {
  return ranks[index]!;
}
