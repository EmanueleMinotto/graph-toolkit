import type { Csr } from '@graph-sdk/core';
import type { Pair } from './biconnected.js';

/** Vertices of every block (blocks share only articulation points). */
export const blockVertices = (blocks: readonly (readonly Pair[])[]): number[][] =>
  blocks.map((block) => [...new Set(block.flat())]);

/** Vertices that appear in at least two blocks. */
export function articulationIndices(blocks: readonly (readonly Pair[])[]): number[] {
  const seen = new Set<number>();
  const repeated = new Set<number>();

  for (const vertex of blockVertices(blocks).flat()) {
    if (seen.has(vertex)) {
      repeated.add(vertex);
    }

    seen.add(vertex);
  }

  return [...repeated];
}

/** Blocks made of a single edge. */
export const bridgePairs = (blocks: readonly (readonly Pair[])[]): Pair[] =>
  blocks.filter((block) => block.length === 1).map((block) => block[0]!);

/** Symmetric neighbor sets (arc directions ignored, loops dropped). */
export function symmetricSets(csr: Csr, count: number): Set<number>[] {
  const sets = Array.from({ length: count }, () => new Set<number>());

  for (let vertex = 0; vertex < count; vertex++) {
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const target = csr.targets[slot]!;

      if (target === vertex) {
        continue;
      }

      sets[vertex]!.add(target);
      sets[target]!.add(vertex);
    }
  }

  return sets;
}

interface Peel {
  readonly adjacency: readonly ReadonlySet<number>[];
  readonly degree: Int32Array;
  readonly core: Int32Array;
}

function peelFrom(peel: Peel, stack: number[], level: number): number {
  let removed = 0;

  while (stack.length > 0) {
    const vertex = stack.pop()!;

    if (peel.core[vertex] !== -1) {
      continue;
    }

    peel.core[vertex] = level;
    removed++;
    const neighbors = peel.adjacency[vertex]!;

    for (const next of neighbors) {
      peel.degree[next]!--;

      if (peel.core[next] === -1 && peel.degree[next]! <= level) {
        stack.push(next);
      }
    }
  }

  return removed;
}

const lowDegree = (peel: Peel, level: number): number[] =>
  [...peel.degree.keys()].filter(
    (vertex) => peel.core[vertex] === -1 && peel.degree[vertex]! <= level,
  );

/** Peeling: the core number of v is the largest k such that v survives in the k-core. */
export function coreNumbers(adjacency: readonly ReadonlySet<number>[]): Int32Array {
  const degree = Int32Array.from(adjacency, (neighbors) => neighbors.size);
  const peel: Peel = { adjacency, degree, core: new Int32Array(adjacency.length).fill(-1) };
  let left = adjacency.length;
  let level = 0;

  while (left > 0) {
    left -= peelFrom(peel, lowDegree(peel, level), level);
    level++;
  }

  return peel.core;
}

/** Local clustering coefficient of `vertex` over symmetric neighbor sets. */
export function clustering(adjacency: readonly ReadonlySet<number>[], vertex: number): number {
  const neighbors = [...adjacency[vertex]!];
  const possible = (neighbors.length * (neighbors.length - 1)) / 2;

  if (possible === 0) {
    return 0;
  }

  let linked = 0;

  for (const [index, first] of neighbors.entries()) {
    const later = neighbors.slice(index + 1);

    linked += later.filter((second) => adjacency[first]!.has(second)).length;
  }

  return linked / possible;
}

/** Hop distances from `start`; unreachable vertices stay `Infinity`. */
export function hopDistances(csr: Csr, start: number): Float64Array {
  const distance = new Float64Array(csr.offsets.length - 1).fill(Infinity);

  distance[start] = 0;
  const queue = [start];

  for (let head = 0; head < queue.length; head++) {
    const vertex = queue[head]!;

    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const next = csr.targets[slot]!;

      if (distance[next] !== Infinity) {
        continue;
      }

      distance[next] = distance[vertex]! + 1;
      queue.push(next);
    }
  }

  return distance;
}

/** Ordered pairs (u, v), u ≠ v, with v reachable from u. */
export function reachablePairs(csr: Csr, count: number): Pair[] {
  const pairs: Pair[] = [];

  for (let from = 0; from < count; from++) {
    const distances = hopDistances(csr, from);

    for (const [to, distance] of distances.entries()) {
      if (distance > 0 && distance < Infinity) {
        pairs.push([from, to]);
      }
    }
  }

  return pairs;
}

function lowestDegree(adjacency: readonly Set<number>[], alive: ReadonlySet<number>): number {
  let best = -1;

  for (const vertex of alive) {
    if (best === -1 || adjacency[vertex]!.size < adjacency[best]!.size) {
      best = vertex;
    }
  }

  return best;
}

/** Removes `vertex`, joining its neighbors into a clique; returns how many it had. */
function eliminate(adjacency: Set<number>[], vertex: number): number {
  const neighbors = [...adjacency[vertex]!];

  for (const left of neighbors) {
    adjacency[left]!.delete(vertex);

    for (const right of neighbors) {
      if (right !== left) {
        adjacency[left]!.add(right);
      }
    }
  }

  return neighbors.length;
}

/** Min-degree elimination: the widest bag created is an upper bound on the treewidth. */
export function minDegreeWidth(adjacency: Set<number>[]): number {
  const alive = new Set(adjacency.keys());
  let width = 0;

  while (alive.size > 0) {
    const vertex = lowestDegree(adjacency, alive);

    width = Math.max(width, eliminate(adjacency, vertex));
    alive.delete(vertex);
  }

  return width;
}
