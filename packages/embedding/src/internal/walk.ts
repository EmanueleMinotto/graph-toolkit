import type { Csr } from '@graph-sdk/core';

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
