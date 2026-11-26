import { describe, expect, it } from 'vitest';
import { refine } from './leiden.js';
import type { Level } from './louvain.js';

const settings = { resolution: 1, maxIterations: 10 };

/** Symmetric weighted adjacency from `[a, b, weight]` triples. */
const levelOf = (edges: readonly (readonly [number, number, number])[]): Level => {
  const rows = Array.from({ length: 4 }, () => new Map<number, number>());

  for (const [left, right, weight] of edges) {
    rows[left]!.set(right, weight);
    rows[right]!.set(left, weight);
  }

  return rows;
};

describe('refine', () => {
  it('keeps a vertex alone when it barely touches the rest of its community', () => {
    // Vertex 0 is in the community of 2 and 3 but its only edge goes to vertex 1, elsewhere.
    const level = levelOf([
      [0, 1, 5],
      [2, 3, 5],
    ]);
    const refined = refine(level, Int32Array.from([0, 1, 0, 0]), settings);

    expect(refined[0]).toBe(0);
    expect(refined[2]).toBe(refined[3]);
  });

  it('only merges inside a community, never across', () => {
    const level = levelOf([
      [0, 1, 1],
      [1, 2, 1],
      [2, 3, 1],
    ]);
    const refined = refine(level, Int32Array.from([0, 0, 1, 1]), settings);

    expect(refined[0]).toBe(refined[1]);
    expect(refined[2]).toBe(refined[3]);
    expect(refined[1]).not.toBe(refined[2]);
  });
});
