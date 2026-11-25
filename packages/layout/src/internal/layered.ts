import type { Csr } from '@graph-toolkit/core';

function inNeighbors(csr: Csr, count: number): number[][] {
  const incoming: number[][] = Array.from({ length: count }, () => []);
  for (let vertex = 0; vertex < count; vertex++) {
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      incoming[csr.targets[slot]!]!.push(vertex);
    }
  }
  return incoming;
}

/** Longest-path layering via Kahn; `undefined` when the graph has a cycle. */
function longestPathLevels(csr: Csr, count: number): Int32Array | undefined {
  const inDegree = new Int32Array(count);
  for (const target of csr.targets) inDegree[target]!++;
  const levels = new Int32Array(count);
  const queue = Array.from({ length: count }, (_, vertex) => vertex).filter(
    (vertex) => inDegree[vertex] === 0,
  );
  for (let head = 0; head < queue.length; head++) {
    const vertex = queue[head]!;
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const target = csr.targets[slot]!;
      levels[target] = Math.max(levels[target]!, levels[vertex]! + 1);
      inDegree[target]!--;
      if (inDegree[target] === 0) queue.push(target);
    }
  }
  return queue.length === count ? levels : undefined;
}

function bfsFrom(csr: Csr, root: number, levels: Int32Array): void {
  levels[root] = 0;
  const queue = [root];
  for (let head = 0; head < queue.length; head++) {
    const vertex = queue[head]!;
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const target = csr.targets[slot]!;
      if (levels[target] !== -1) continue;
      levels[target] = levels[vertex]! + 1;
      queue.push(target);
    }
  }
}

/** BFS depth from the first unvisited vertex of each component. */
function bfsLevels(csr: Csr, count: number): Int32Array {
  const levels = new Int32Array(count).fill(-1);
  for (let root = 0; root < count; root++) {
    if (levels[root] === -1) bfsFrom(csr, root, levels);
  }
  return levels;
}

function groupByLevel(levels: Int32Array): number[][] {
  const groups: number[][] = Array.from({ length: Math.max(-1, ...levels) + 1 }, () => []);
  for (const [vertex, level] of levels.entries()) groups[level]!.push(vertex);
  return groups;
}

/** Mean rank of the (non-empty) parent set; every vertex below level 0 has a parent. */
const barycenter = (parents: readonly number[], rank: Int32Array): number =>
  parents.reduce((sum, parent) => sum + rank[parent]!, 0) / parents.length;

function sweep(groups: number[][], incoming: readonly number[][], rank: Int32Array): void {
  for (const group of groups.slice(1)) {
    group.sort(
      (left, right) => barycenter(incoming[left]!, rank) - barycenter(incoming[right]!, rank),
    );
    for (const [position, vertex] of group.entries()) rank[vertex] = position;
  }
}

export interface Placement {
  readonly level: Int32Array;
  readonly rank: Int32Array;
  readonly widths: Int32Array;
}

const SWEEPS = 4;

/** Layers (DAG longest path, else BFS depth) with barycenter ordering to cut crossings. */
export function layer(csr: Csr, count: number): Placement {
  const level = longestPathLevels(csr, count) ?? bfsLevels(csr, count);
  const groups = groupByLevel(level);
  const rank = new Int32Array(count);
  for (const group of groups) {
    for (const [position, vertex] of group.entries()) rank[vertex] = position;
  }
  const incoming = inNeighbors(csr, count).map((parents, vertex) =>
    parents.filter((parent) => level[parent]! < level[vertex]!),
  );
  for (let round = 0; round < SWEEPS; round++) sweep(groups, incoming, rank);
  return { level, rank, widths: Int32Array.from(groups, (group) => group.length) };
}

export function placementAt(values: Int32Array, index: number): number {
  return values[index]!;
}
