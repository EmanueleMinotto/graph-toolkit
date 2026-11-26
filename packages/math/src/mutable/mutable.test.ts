import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { DisjointSet, MinPriorityQueue } from '../index.js';

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
        const popped = priorities.map(() => queue.pop()!.priority);

        expect(popped).toEqual(priorities.toSorted((a, b) => a - b));
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
