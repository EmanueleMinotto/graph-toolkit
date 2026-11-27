import { describe, expect, it } from 'vitest';
import { DisjointSet } from './disjoint-set.js';

describe('DisjointSet representatives', () => {
  it('attaches the lower-ranked root under the higher-ranked one', () => {
    const sets = new DisjointSet(6);

    sets.union(0, 1);
    expect(sets.find(0)).toBe(1);

    sets.union(1, 2);
    expect(sets.find(2)).toBe(1);

    sets.union(3, 4);
    expect(sets.find(3)).toBe(4);

    sets.union(2, 3);
    expect(sets.find(4)).toBe(4);
    expect(sets.find(0)).toBe(4);
    expect(sets.setCount()).toBe(2);
  });

  it('keeps a deeper tree on top of a singleton in either argument order', () => {
    const sets = new DisjointSet(5);

    sets.union(0, 1);
    sets.union(2, 3);
    sets.union(0, 2);

    const root = sets.find(0);

    expect([0, 1, 2, 3].map((vertex) => sets.find(vertex))).toEqual([root, root, root, root]);
    expect(sets.union(4, 0)).toBe(true);
    expect(sets.find(4)).toBe(root);
    expect(sets.union(root, 4)).toBe(false);
  });

  it('lets a rank-2 tree absorb a rank-1 tree', () => {
    const sets = new DisjointSet(6);

    sets.union(0, 1);
    sets.union(2, 3);
    sets.union(4, 5);
    sets.union(3, 5);
    sets.union(1, 5);

    expect(sets.find(0)).toBe(5);
    expect(sets.find(1)).toBe(5);
  });
});
