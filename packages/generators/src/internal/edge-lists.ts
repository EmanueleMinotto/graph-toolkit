export type Pair = readonly [number, number];

export function pathPairs(count: number): Pair[] {
  return Array.from({ length: Math.max(count - 1, 0) }, (_, index): Pair => [index, index + 1]);
}

export function cyclePairs(count: number): Pair[] {
  return count < 3 ? pathPairs(count) : [...pathPairs(count), [count - 1, 0]];
}

export function completePairs(count: number): Pair[] {
  const pairs: Pair[] = [];
  for (let from = 0; from < count; from++) {
    for (let to = from + 1; to < count; to++) pairs.push([from, to]);
  }
  return pairs;
}

export function starPairs(count: number): Pair[] {
  return Array.from({ length: Math.max(count - 1, 0) }, (_, index): Pair => [0, index + 1]);
}

export function gridPairs(rows: number, columns: number): Pair[] {
  const pairs: Pair[] = [];
  for (let row = 0; row < rows; row++) {
    for (let column = 0; column < columns; column++) {
      const cell = row * columns + column;
      if (column + 1 < columns) pairs.push([cell, cell + 1]);
      if (row + 1 < rows) pairs.push([cell, cell + columns]);
    }
  }
  return pairs;
}

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

/** G(n, p): every pair is an edge with probability `probability`. */
export function randomPairs(count: number, probability: number, seed: number): Pair[] {
  const next = mulberry32(seed);
  return completePairs(count).filter(() => next() < probability);
}
