import type { AbortSignalLike } from '@graph-sdk/core';

const countBits = (mask: number): number => {
  let rest = mask;
  let count = 0;

  while (rest !== 0) {
    rest &= rest - 1;
    count++;
  }

  return count;
};

/** Breadth-first search from `start` over unseen vertices. */
function explore(adjacency: readonly Set<number>[], start: number, seen: Set<number>): number[] {
  const group = [start];

  seen.add(start);

  for (const vertex of group) {
    const fresh = adjacency[vertex]!.difference(seen);

    for (const next of fresh) {
      seen.add(next);
      group.push(next);
    }
  }

  return group;
}

/** Vertex indices of the connected components (adjacency is symmetric). */
export function componentsOf(adjacency: readonly Set<number>[]): number[][] {
  const seen = new Set<number>();
  const groups: number[][] = [];

  for (let start = 0; start < adjacency.length; start++) {
    if (seen.has(start)) {
      continue;
    }

    groups.push(explore(adjacency, start, seen));
  }

  return groups;
}

/** Number of vertices in the biggest connected component. */
export function largestComponent(adjacency: readonly Set<number>[]): number {
  let largest = 0;

  for (const group of componentsOf(adjacency)) {
    largest = Math.max(largest, group.length);
  }

  return largest;
}

/** Bitmask adjacency of `members` renumbered `0..k-1` (the adjacency has no self-loops). */
function masksOf(adjacency: readonly Set<number>[], members: readonly number[]): number[] {
  const local = new Map(members.map((vertex, index) => [vertex, index]));

  return members.map((vertex) => {
    const neighbors = adjacency[vertex]!;
    let mask = 0;

    for (const next of neighbors) {
      mask |= 1 << local.get(next)!;
    }

    return mask;
  });
}

/** Union of the neighborhoods of the vertices in `component`. */
function reachOf(masks: readonly number[], component: number): number {
  let reach = 0;

  for (let member = 0; member < masks.length; member++) {
    if ((component >> member) & 1) {
      reach |= masks[member]!;
    }
  }

  return reach;
}

/** Q(S, v): vertices outside S ∪ {v} reachable from v through S — the bag created by eliminating v. */
function boundary(masks: readonly number[], inside: number, vertex: number): number {
  let component = 1 << vertex;

  for (;;) {
    const reach = reachOf(masks, component);
    const grown = component | (reach & inside);

    if (grown === component) {
      return countBits(reach & ~inside & ~(1 << vertex));
    }

    component = grown;
  }
}

/** Exact treewidth of one connected component by dynamic programming over vertex subsets (BFKKT). */
function widthOf(masks: readonly number[], signal: AbortSignalLike | undefined): number {
  const best = new Int8Array(1 << masks.length);

  for (let subset = 1; subset < best.length; subset++) {
    signal?.throwIfAborted();
    best[subset] = masks.length;

    for (let vertex = 0; vertex < masks.length; vertex++) {
      if (!((subset >> vertex) & 1)) {
        continue;
      }

      const before = subset ^ (1 << vertex);
      const bag = Math.max(best[before]!, boundary(masks, before, vertex));

      best[subset] = Math.min(best[subset]!, bag);
    }
  }

  return best.at(-1)!;
}

/** Exact treewidth: the maximum over connected components, $O(2^k \cdot k^3)$ for components of $k$ vertices. */
export function exactTreewidth(
  adjacency: readonly Set<number>[],
  signal: AbortSignalLike | undefined,
): number {
  let widest = 0;

  for (const members of componentsOf(adjacency)) {
    widest = Math.max(widest, widthOf(masksOf(adjacency, members), signal));
  }

  return widest;
}
