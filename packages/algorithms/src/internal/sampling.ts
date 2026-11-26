/** Mulberry32 PRNG: deterministic floats in [0, 1) from a 32-bit seed. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);

    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

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
