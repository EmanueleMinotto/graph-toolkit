import { mulberry32 } from '@graph-sdk/math';

/** `count` distinct indices out of `0..size-1` (partial seeded Fisher–Yates); all of them if `count ≥ size`. */
export function sampleIndices(size: number, count: number, seed: number): number[] {
  const pool = Array.from({ length: size }, (_, index) => index);
  const chosen = Math.min(count, size);
  const next = mulberry32(seed);

  for (let index = 0; index < chosen; index++) {
    const pick = index + Math.floor(next() * (size - index));

    [pool[index], pool[pick]] = [pool[pick]!, pool[index]!];
  }

  // Ascending order keeps floating-point sums identical to the exhaustive run.
  return pool.slice(0, chosen).toSorted((left, right) => left - right);
}
