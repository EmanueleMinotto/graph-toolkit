import type { Csr } from '@graph-sdk/core';

/** Mulberry32 PRNG: deterministic floats in [0, 1) from a 32-bit seed. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);

    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

export interface Plan {
  /** Maximum vertices per walk, start included. */
  readonly length: number;
  readonly next: () => number;
  readonly isWeighted: boolean;
}

/** The vertex reached from `vertex` by one step, or `undefined` at a sink. */
function step(csr: Csr, vertex: number, plan: Plan): number | undefined {
  const draw = plan.next();
  const start = csr.offsets[vertex]!;
  const end = csr.offsets[vertex + 1]!;

  if (start === end) {
    return undefined;
  }

  if (!plan.isWeighted) {
    return csr.targets[start + Math.floor(draw * (end - start))];
  }

  const threshold =
    draw * csr.weights.subarray(start, end).reduce((sum, weight) => sum + weight, 0);
  let running = 0;
  let passed = 0;

  for (let slot = start; slot < end; slot++) {
    running += csr.weights[slot]!;
    passed += Number(running <= threshold);
  }

  return csr.targets[start + Math.min(passed, end - start - 1)];
}

/** One walk from `start`, as vertex indices. */
export function walk(csr: Csr, start: number, plan: Plan): number[] {
  const path = [start];

  while (path.length < plan.length) {
    const next = step(csr, path.at(-1)!, plan);

    if (next === undefined) {
      break;
    }

    path.push(next);
  }

  return path;
}
