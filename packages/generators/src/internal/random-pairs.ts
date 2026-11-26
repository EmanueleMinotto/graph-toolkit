import { mulberry32 } from '@graph-sdk/math';
import { completePairs, type Pair } from './edge-lists.js';

const key = (from: number, to: number): string =>
  `${String(Math.min(from, to))}:${String(Math.max(from, to))}`;

/** G(n, m): exactly `edges` distinct pairs chosen by a seeded Fisher–Yates shuffle. */
export function fixedSizePairs(count: number, edges: number, seed: number): Pair[] {
  const pairs = completePairs(count);
  const next = mulberry32(seed);

  for (let index = pairs.length - 1; index > 0; index--) {
    const other = Math.floor(next() * (index + 1));

    [pairs[index], pairs[other]] = [pairs[other]!, pairs[index]!];
  }

  return pairs.slice(0, Math.min(edges, pairs.length));
}

function pickTargets(endpoints: readonly number[], wanted: number, next: () => number): number[] {
  const chosen = new Set<number>();

  while (chosen.size < wanted) {
    chosen.add(endpoints[Math.floor(next() * endpoints.length)]!);
  }

  return [...chosen];
}

/**
 * Barabási–Albert preferential attachment: starts from a clique of `attach + 1` vertices;
 * each new vertex links to `attach` distinct earlier vertices, chosen proportionally to degree.
 */
export function preferentialPairs(count: number, attach: number, seed: number): Pair[] {
  const seedSize = Math.min(attach + 1, count);
  const pairs = completePairs(seedSize);
  const endpoints = pairs.flat();
  const next = mulberry32(seed);

  for (let vertex = seedSize; vertex < count; vertex++) {
    for (const target of pickTargets(endpoints, attach, next)) {
      pairs.push([target, vertex]);
      endpoints.push(target, vertex);
    }
  }

  return pairs;
}

function ringLattice(count: number, reach: number): Pair[] {
  const seen = new Set<string>();
  const pairs: Pair[] = [];

  for (let from = 0; from < count; from++) {
    for (let step = 1; step <= reach; step++) {
      const to = (from + step) % count;

      if (to === from || seen.has(key(from, to))) {
        continue;
      }

      seen.add(key(from, to));
      pairs.push([from, to]);
    }
  }

  return pairs;
}

export interface Rewiring {
  readonly neighbors: number;
  readonly beta: number;
  readonly seed: number;
}

/**
 * Watts–Strogatz small world: ring lattice where each vertex links to `neighbors / 2` successors,
 * then each edge's far end is rewired with probability `beta` (never to a loop or duplicate).
 */
export function smallWorldPairs(count: number, rewiring: Rewiring): Pair[] {
  const { neighbors, beta, seed } = rewiring;
  const lattice = ringLattice(count, Math.floor(neighbors / 2));
  const taken = new Set(lattice.map(([from, to]) => key(from, to)));
  const next = mulberry32(seed);

  return lattice.map(([from, to]): Pair => {
    const candidate = Math.floor(next() * count);
    const free = candidate !== from && !taken.has(key(from, candidate));

    if (!free || next() >= beta) {
      return [from, to];
    }

    taken.delete(key(from, to));
    taken.add(key(from, candidate));

    return [from, candidate];
  });
}
