import type { Csr } from '@graph-sdk/core';
import type { Network } from './centrality.js';
import { renumber } from './community.js';

/** Symmetric weighted adjacency; `level[i].get(i)` is twice the loop weight, so degrees are row sums. */
export type Level = readonly Map<number, number>[];

export interface LouvainSettings {
  readonly resolution: number;
  readonly maxIterations: number;
}

export const identity = (count: number): Int32Array =>
  Int32Array.from({ length: count }, (_, index) => index);

export const add = (row: Map<number, number>, key: number, weight: number): void => {
  row.set(key, (row.get(key) ?? 0) + weight);
};

/** Edge direction is ignored: every arc contributes to both endpoints. */
export function firstLevel(csr: Csr, count: number, isDirected: boolean): Level {
  const level: Level = Array.from({ length: count }, () => new Map<number, number>());

  for (let from = 0; from < count; from++) {
    for (let slot = csr.offsets[from]!; slot < csr.offsets[from + 1]!; slot++) {
      const [to, weight] = [csr.targets[slot]!, csr.weights[slot]!];

      if (to === from) {
        add(level[from]!, from, 2 * weight);
        continue;
      }

      add(level[from]!, to, weight);

      if (isDirected) {
        add(level[to]!, from, weight);
      }
    }
  }

  return level;
}

export function sumOf(values: Iterable<number>): number {
  let sum = 0;

  for (const value of values) {
    sum += value;
  }

  return sum;
}

export const degrees = (level: Level): Float64Array =>
  Float64Array.from(level, (row) => sumOf(row.values()));

/** Weight from `node` into each neighboring community, own loop excluded. */
function linksOf(level: Level, community: Int32Array, node: number): Map<number, number> {
  const links = new Map<number, number>();
  const row = level[node]!;

  for (const [other, weight] of row) {
    if (other !== node) {
      add(links, community[other]!, weight);
    }
  }

  return links;
}

interface Moving {
  readonly level: Level;
  readonly community: Int32Array;
  readonly degree: Float64Array;
  readonly total: Float64Array;
  readonly scale: number;
}

function moveNode(moving: Moving, node: number): boolean {
  const { community, total, degree, scale } = moving;
  const own = community[node]!;
  const links = linksOf(moving.level, community, node);
  // Modularity gain (up to a constant factor) of putting `node` into `group`.
  const gain = (group: number): number =>
    (links.get(group) ?? 0) - total[group]! * degree[node]! * scale;
  const candidates = [...links.keys()].toSorted((left, right) => left - right);
  let best = own;

  total[own]! -= degree[node]!;

  for (const group of candidates) {
    if (gain(group) > gain(best) + 1e-12) {
      best = group;
    }
  }

  total[best]! += degree[node]!;
  community[node] = best;

  return best !== own;
}

/** Resolution divided by twice the total weight: the factor of the expected-weight term. */
export const scaleOf = (degree: Float64Array, resolution: number): number => {
  const twiceWeight = sumOf(degree);

  return twiceWeight === 0 ? 0 : resolution / twiceWeight;
};

/** Sum of degrees per community label. */
export function totalsOf(degree: Float64Array, labels: Int32Array): Float64Array {
  const total = new Float64Array(degree.length);

  for (const [node, label] of labels.entries()) {
    total[label]! += degree[node]!;
  }

  return total;
}

/**
 * Phase 1: greedy node moves until nothing improves (deterministic node and community order),
 * starting from the partition `start` (labels below the number of nodes).
 */
export function localMoving(
  level: Level,
  { resolution, maxIterations }: LouvainSettings,
  start: Int32Array,
): Int32Array {
  const degree = degrees(level);
  const community = Int32Array.from(start);
  const scale = scaleOf(degree, resolution);
  const moving: Moving = { level, community, degree, total: totalsOf(degree, start), scale };

  for (let round = 0; round < maxIterations; round++) {
    const moved = level.map((_, node) => moveNode(moving, node));

    if (!moved.includes(true)) {
      break;
    }
  }

  return community;
}

/** Phase 2: communities become the vertices of the next level. */
export function aggregate(level: Level, groups: readonly number[], count: number): Level {
  const next: Level = Array.from({ length: count }, () => new Map<number, number>());

  for (const [node, row] of level.entries()) {
    for (const [other, weight] of row) {
      add(next[groups[node]!]!, groups[other]!, weight);
    }
  }

  return next;
}

/** Louvain with a resolution parameter; returns one label per vertex (not yet connectivity-fixed). */
export function louvain(
  { csr, vertexCount, isDirected }: Network,
  settings: LouvainSettings,
): number[] {
  let level = firstLevel(csr, vertexCount, isDirected);
  let membership = Array.from({ length: vertexCount }, (_, node) => node);

  for (;;) {
    const groups = renumber(localMoving(level, settings, identity(level.length)));
    const groupCount = groups.reduce((top, group) => Math.max(top, group), -1) + 1;

    if (groupCount === level.length) {
      return membership;
    }

    membership = membership.map((node) => groups[node]!);
    level = aggregate(level, groups, groupCount);
  }
}

/** Splits every community into its connected components (arc direction ignored). */
export function splitDisconnected(csr: Csr, labels: readonly number[]): number[] {
  const parent = Int32Array.from(labels, (_, node) => node);
  const root = (node: number): number => {
    let current = node;

    while (parent[current] !== current) {
      parent[current] = parent[parent[current]!]!;
      current = parent[current]!;
    }

    return current;
  };

  for (let from = 0; from < labels.length; from++) {
    for (let slot = csr.offsets[from]!; slot < csr.offsets[from + 1]!; slot++) {
      const to = csr.targets[slot]!;

      if (labels[from] === labels[to]) {
        parent[root(from)] = root(to);
      }
    }
  }

  return renumber(Int32Array.from(labels, (_, node) => root(node)));
}
