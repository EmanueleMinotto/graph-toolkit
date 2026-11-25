import type { Csr, VertexId } from '@graph-toolkit/core';

function neighborColors(csr: Csr, vertex: number, colors: Int32Array): Set<number> {
  const used = new Set<number>();
  for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
    const color = colors[csr.targets[slot]!]!;
    if (color >= 0) used.add(color);
  }
  return used;
}

function smallestFree(used: ReadonlySet<number>): number {
  let color = 0;
  while (used.has(color)) color++;
  return color;
}

/** Colors vertices in the given index order with the smallest free color, O(V + E) + order. */
export function greedyKernel(csr: Csr, vertexCount: number, order: readonly number[]): Int32Array {
  const colors = new Int32Array(vertexCount).fill(-1);
  for (const vertex of order) colors[vertex] = smallestFree(neighborColors(csr, vertex, colors));
  return colors;
}

function saturationKey(csr: Csr, vertex: number, colors: Int32Array): readonly [number, number] {
  return [
    neighborColors(csr, vertex, colors).size,
    csr.offsets[vertex + 1]! - csr.offsets[vertex]!,
  ];
}

function isBetter(key: readonly [number, number], best: readonly [number, number]): boolean {
  return key[0] > best[0] || (key[0] === best[0] && key[1] > best[1]);
}

function mostSaturated(csr: Csr, colors: Int32Array): number {
  let best = -1;
  let bestKey: readonly [number, number] = [-1, -1];
  for (let vertex = 0; vertex < colors.length; vertex++) {
    if (colors[vertex]! >= 0) continue;
    const key = saturationKey(csr, vertex, colors);
    if (!isBetter(key, bestKey)) continue;
    best = vertex;
    bestKey = key;
  }
  return best;
}

/** DSATUR heuristic, O(V·E). */
export function dsaturKernel(csr: Csr, vertexCount: number): Int32Array {
  const colors = new Int32Array(vertexCount).fill(-1);
  for (let step = 0; step < vertexCount; step++) {
    const vertex = mostSaturated(csr, colors);
    colors[vertex] = smallestFree(neighborColors(csr, vertex, colors));
  }
  return colors;
}

/** Colors the component of `start` with 0/1; returns false on an odd cycle. */
function colorComponent(csr: Csr, start: number, colors: Int32Array): boolean {
  colors[start] = 0;
  const queue = [start];
  for (let head = 0; head < queue.length; head++) {
    const vertex = queue[head]!;
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const target = csr.targets[slot]!;
      if (colors[target] === colors[vertex]) return false;
      if (colors[target]! >= 0) continue;
      colors[target] = 1 - colors[vertex]!;
      queue.push(target);
    }
  }
  return true;
}

/** BFS 2-coloring, O(V + E). `undefined` when an odd cycle exists. */
export function bipartiteKernel(csr: Csr, vertexCount: number): Int32Array | undefined {
  const colors = new Int32Array(vertexCount).fill(-1);
  for (let start = 0; start < vertexCount; start++) {
    if (colors[start]! < 0 && !colorComponent(csr, start, colors)) return undefined;
  }
  return colors;
}

export function toColorMap(ids: readonly VertexId[], colors: Int32Array): Map<VertexId, number> {
  return new Map(ids.map((id, index) => [id, colors[index]!]));
}

export function countColors(colors: Int32Array): number {
  return colors.reduce((max, color) => Math.max(max, color + 1), 0);
}
