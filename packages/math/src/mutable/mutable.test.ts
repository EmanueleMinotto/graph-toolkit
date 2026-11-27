import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DisjointSet, MinPriorityQueue, mulberry32 } from '../index.js';

describe('MinPriorityQueue', () => {
  it('returns undefined when empty', () => {
    expect(new MinPriorityQueue().pop()).toBeUndefined();
  });

  it('pops in non-decreasing priority order', () => {
    fc.assert(
      fc.property(fc.array(fc.double({ noNaN: true })), (priorities) => {
        const queue = new MinPriorityQueue();

        for (const [item, priority] of priorities.entries()) {
          queue.push(item, priority);
        }

        expect(queue.size()).toBe(priorities.length);
        // `+ 0` folds -0 into 0: the two compare equal, so the heap may return them in either order
        const popped = priorities.map(() => queue.pop()!.priority + 0);

        expect(popped).toEqual(
          priorities.toSorted((a, b) => a - b).map((priority) => priority + 0),
        );

        expect(queue.size()).toBe(0);
      }),
    );
  });
});

describe('DisjointSet', () => {
  it('starts with singleton sets', () => {
    const sets = new DisjointSet(3);

    expect(sets.setCount()).toBe(3);
    expect(sets.find(2)).toBe(2);
  });

  it('merges sets and reports redundant unions', () => {
    const sets = new DisjointSet(5);

    expect(sets.union(0, 1)).toBe(true);
    expect(sets.union(1, 0)).toBe(false);
    sets.union(2, 3);
    sets.union(1, 3);
    expect(sets.find(0)).toBe(sets.find(2));
    expect(sets.find(4)).not.toBe(sets.find(0));
    expect(sets.setCount()).toBe(2);
  });

  it('compresses long chains', () => {
    const sets = new DisjointSet(64);

    for (let index = 1; index < 64; index++) {
      sets.union(index - 1, index);
    }

    expect(new Set(Array.from({ length: 64 }, (_, index) => sets.find(index))).size).toBe(1);
  });
});

describe('mulberry32', () => {
  it('is deterministic per seed and stays in [0, 1)', () => {
    const first = mulberry32(42);
    const second = mulberry32(42);
    const draws = Array.from({ length: 1000 }, () => first());

    expect(draws).toEqual(Array.from({ length: 1000 }, () => second()));
    expect(draws.every((value) => value >= 0 && value < 1)).toBe(true);
    expect(mulberry32(43)()).not.toBe(mulberry32(42)());
  });
});

describe('mutation-hardening', () => {
  it('pins the mulberry32 stream', () => {
    const next = mulberry32(1);

    expect([next(), next(), next()]).toEqual([
      0.6270739405881613, 0.002735721180215478, 0.5274470399599522,
    ]);

    expect(mulberry32(0xde_ad_be_ef)()).toBeCloseTo(0.9413696140982211, 12);
  });

  it('pops equal priorities in a stable, heap-defined order', () => {
    const queue = new MinPriorityQueue();

    for (const [item, priority] of [
      [0, 2],
      [1, 1],
      [2, 2],
      [3, 1],
      [4, 2],
      [5, 1],
      [6, 3],
    ] as const) {
      queue.push(item, priority);
    }

    const order: string[] = [];

    for (let entry = queue.pop(); entry !== undefined; entry = queue.pop()) {
      order.push(`${entry.item}:${entry.priority}`);
    }

    expect(order.join(' ')).toBe('1:1 3:1 5:1 4:2 0:2 2:2 6:3');
  });

  it('tracks set count and membership across unions', () => {
    const sets = new DisjointSet(6);

    expect(sets.setCount()).toBe(6);
    expect(sets.union(0, 1)).toBe(true);
    expect(sets.union(2, 3)).toBe(true);
    expect(sets.union(1, 3)).toBe(true);
    expect(sets.union(0, 2)).toBe(false);
    expect(sets.setCount()).toBe(3);
    expect(sets.find(0)).toBe(sets.find(3));
    expect(sets.find(4)).toBe(4);
    expect(sets.find(5)).not.toBe(sets.find(4));
  });
});
