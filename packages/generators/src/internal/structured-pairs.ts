import { cyclePairs, starPairs, type Pair } from './edge-lists.js';

/** Hub `0` joined to a cycle on the remaining vertices. */
export function wheelPairs(count: number): Pair[] {
  const rim = cyclePairs(Math.max(count - 1, 0)).map(([from, to]): Pair => [from + 1, to + 1]);

  return [...starPairs(count), ...rim];
}

/** Parts `0..left-1` and `left..left+right-1`, every cross pair connected. */
export function completeBipartitePairs(left: number, right: number): Pair[] {
  const pairs: Pair[] = [];

  for (let from = 0; from < left; from++) {
    for (let to = 0; to < right; to++) {
      pairs.push([from, left + to]);
    }
  }

  return pairs;
}

/** Heap-shaped binary tree: the parent of `i` is `(i - 1) >> 1`. */
export function binaryTreePairs(count: number): Pair[] {
  return Array.from({ length: Math.max(count - 1, 0) }, (_, index): Pair => [
    index >> 1,
    index + 1,
  ]);
}

/** Vertices are bit strings of length `dimension`; edges flip one bit. */
export function hypercubePairs(dimension: number): Pair[] {
  const pairs: Pair[] = [];

  for (let vertex = 0; vertex < 2 ** dimension; vertex++) {
    for (let bit = 0; bit < dimension; bit++) {
      const other = vertex ^ (1 << bit);

      if (vertex < other) {
        pairs.push([vertex, other]);
      }
    }
  }

  return pairs;
}

/** Outer 5-cycle, inner pentagram, five spokes. */
export function petersenPairs(): Pair[] {
  return Array.from({ length: 5 }, (_, index): Pair[] => [
    [index, (index + 1) % 5],
    [index, index + 5],
    [index + 5, ((index + 2) % 5) + 5],
  ]).flat();
}
