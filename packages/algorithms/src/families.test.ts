import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { describe, expect, it } from 'vitest';
import { isPlanar, leiden, louvain } from './index.js';

type Pair = readonly [number, number];

function lcg(seed: number): () => number {
  let state = seed;

  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;

    return state / 2_147_483_648;
  };
}

function build(count: number, pairs: readonly Pair[]): Graph {
  const builder = new GraphBuilder();

  for (let index = 0; index < count; index++) {
    builder.addVertex(vertexId(String(index)));
  }

  for (const [from, to] of pairs) {
    builder.addEdge(vertexId(String(from)), vertexId(String(to)));
  }

  return builder.build();
}

const BLOCKS = 4;
const SIZE = 8;
const TOTAL = BLOCKS * SIZE;

const allPairs = (count: number): Pair[] =>
  Array.from({ length: count }, (_, left) =>
    Array.from({ length: count - left - 1 }, (_cell, offset): Pair => [left, left + 1 + offset]),
  ).flat();

const isSameBlock = ([left, right]: Pair): boolean =>
  Math.floor(left / SIZE) === Math.floor(right / SIZE);

/** Four dense blocks of eight vertices joined by a few random cross edges. */
function planted(seed: number): Graph {
  const next = lcg(seed);

  return build(
    TOTAL,
    allPairs(TOTAL).filter((pair) => next() < (isSameBlock(pair) ? 0.85 : 0.015)),
  );
}

const blockOf = (labels: readonly number[], block: number): Set<number> =>
  new Set(labels.slice(block * SIZE, (block + 1) * SIZE));

describe('community detection on planted blocks', () => {
  const seeds = [11, 12, 13, 14, 15, 16];

  it.each([
    ['louvain', louvain],
    ['leiden', leiden],
  ] as const)('%s recovers every block exactly', (_name, detect) => {
    const outcomes = seeds.map((seed) => {
      const labels = [...detect(planted(seed)).values()];
      const blocks = Array.from({ length: BLOCKS }, (_, block) => blockOf(labels, block));

      return {
        pure: blocks.every((set) => set.size === 1),
        distinct: new Set(blocks.map((set) => [...set][0])).size,
      };
    });

    expect(outcomes.map((outcome) => outcome.pure)).toEqual(seeds.map(() => true));
    expect(outcomes.map((outcome) => outcome.distinct)).toEqual(seeds.map(() => BLOCKS));
  });
});

function triangulatedGrid(side: number, keep: () => number, probability: number): Pair[] {
  const at = (row: number, column: number): number => row * side + column;
  const cells = Array.from({ length: side * side }, (_, index) => ({
    row: Math.floor(index / side),
    column: index % side,
  }));
  const candidates = cells.flatMap(({ row, column }): Pair[] => [
    ...(column + 1 < side ? [[at(row, column), at(row, column + 1)] as const] : []),
    ...(row + 1 < side ? [[at(row, column), at(row + 1, column)] as const] : []),
    ...(row + 1 < side && column + 1 < side
      ? [[at(row, column), at(row + 1, column + 1)] as const]
      : []),
  ]);

  return candidates.filter(() => keep() < probability);
}

/** K3,3 whose edges are subdivided a random number of times. */
function subdividedK33(next: () => number): { count: number; pairs: Pair[] } {
  let count = 6;
  const chain = ([left, right]: Pair): Pair[] => {
    const inner = Array.from({ length: Math.floor(next() * 3) }, () => count++);
    const path = [left, ...inner, right];

    return path.slice(1).map((vertex, index): Pair => [path[index]!, vertex]);
  };
  const edges = [0, 1, 2].flatMap((left) => [3, 4, 5].map((right): Pair => [left, right]));
  const pairs = edges.flatMap((edge) => chain(edge));

  return { count, pairs };
}

const K5: readonly Pair[] = allPairs(5);

/** K5 with every edge subdivided once, optionally leaving out the edge 3-4. */
function subdividedK5(isComplete: boolean): Graph {
  const kept = K5.filter(([left, right]) => isComplete || left !== 3 || right !== 4);
  const pairs = kept.flatMap(([left, right], index): Pair[] => [
    [left, 5 + index],
    [5 + index, right],
  ]);

  return build(5 + kept.length, pairs);
}

describe('planarity of large known families', () => {
  const seeds = [21, 22, 23, 24, 25, 26, 27, 28];

  it('accepts every subgraph of a triangulated grid', () => {
    const answers = seeds.map((seed) => {
      const next = lcg(seed);
      const pairs = triangulatedGrid(5, next, 0.35 + (seed % 4) * 0.2);

      return isPlanar(build(25, pairs));
    });

    expect(answers).toEqual(seeds.map(() => true));
  });

  it('rejects subdivided K3,3 even with planar clutter attached', () => {
    const answers = seeds.map((seed) => {
      const next = lcg(seed);
      const { count, pairs } = subdividedK33(next);
      const tail = Array.from({ length: 5 }, (_, index): Pair => [index % 6, count + index]);

      return isPlanar(build(count + 5, [...pairs, ...tail]));
    });

    expect(answers).toEqual(seeds.map(() => false));
  });

  it('rejects subdivided K5 and accepts it once an edge is removed', () => {
    expect(isPlanar(subdividedK5(true))).toBe(false);
    expect(isPlanar(subdividedK5(false))).toBe(true);
  });
});
