import type { Csr } from '@graph-sdk/core';

export interface ForceOptions {
  readonly iterations: number;
  readonly seed: number;
}

const INITIAL_TEMPERATURE = 0.1;
const EPSILON = 1e-9;

/** Small deterministic PRNG (Mulberry32). */
function random(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d_2b_79_f5) >>> 0;
    let mixed = Math.imul(state ^ (state >>> 15), state | 1);

    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);

    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_967_296;
  };
}

interface Field {
  readonly pos: Float64Array;
  readonly disp: Float64Array;
}

function repel({ pos, disp }: Field, spring: number): void {
  const count = pos.length / 2;

  for (let left = 0; left < count; left++) {
    for (let right = left + 1; right < count; right++) {
      const dx = pos[2 * left]! - pos[2 * right]!;
      const dy = pos[2 * left + 1]! - pos[2 * right + 1]!;
      const distance = Math.max(Math.hypot(dx, dy), EPSILON);
      const force = (spring * spring) / distance / distance;

      disp[2 * left]! += dx * force;
      disp[2 * left + 1]! += dy * force;
      disp[2 * right]! -= dx * force;
      disp[2 * right + 1]! -= dy * force;
    }
  }
}

function attract(csr: Csr, { pos, disp }: Field, spring: number): void {
  for (let vertex = 0; vertex < pos.length / 2; vertex++) {
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const other = csr.targets[slot]!;
      const dx = pos[2 * vertex]! - pos[2 * other]!;
      const dy = pos[2 * vertex + 1]! - pos[2 * other + 1]!;
      const force = Math.hypot(dx, dy) / spring;

      disp[2 * vertex]! -= dx * force;
      disp[2 * vertex + 1]! -= dy * force;
    }
  }
}

function move({ pos, disp }: Field, temperature: number): void {
  for (let vertex = 0; vertex < pos.length / 2; vertex++) {
    const length = Math.max(Math.hypot(disp[2 * vertex]!, disp[2 * vertex + 1]!), EPSILON);
    const step = Math.min(length, temperature) / length;

    for (const axis of [2 * vertex, 2 * vertex + 1]) {
      pos[axis] = Math.min(1, Math.max(0, pos[axis]! + disp[axis]! * step));
    }
  }
}

/** Fruchterman–Reingold in the unit square, $O(\text{iterations} \cdot (V^2 + E))$. Returns x,y pairs. */
export function forceKernel(csr: Csr, vertexCount: number, options: ForceOptions): Float64Array {
  const next = random(options.seed);
  const pos = Float64Array.from({ length: vertexCount * 2 }, () => next());
  const spring = Math.sqrt(1 / Math.max(vertexCount, 1));

  for (let iteration = 0; iteration < options.iterations; iteration++) {
    const field: Field = { pos, disp: new Float64Array(pos.length) };

    repel(field, spring);
    attract(csr, field, spring);
    move(field, INITIAL_TEMPERATURE * (1 - iteration / options.iterations));
  }

  return pos;
}

export function coordinate(pos: Float64Array, index: number): number {
  return pos[index]!;
}
