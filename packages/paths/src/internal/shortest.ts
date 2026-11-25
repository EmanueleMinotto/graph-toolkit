import type { Csr } from '@graph-toolkit/core';
import { MinPriorityQueue } from '@graph-toolkit/math';

export interface Distances {
  readonly distances: Float64Array;
  /** Predecessor index per vertex, -1 for the source and unreachable vertices. */
  readonly predecessors: Int32Array;
}

function initialDistances(vertexCount: number, source: number): Distances {
  const distances = new Float64Array(vertexCount).fill(Infinity);
  distances[source] = 0;
  return { distances, predecessors: new Int32Array(vertexCount).fill(-1) };
}

export function hasNegativeWeight(csr: Csr): boolean {
  return csr.weights.some((weight) => weight < 0);
}

/** Dijkstra with lazy-deletion heap, O((V + E) log V). Requires non-negative weights. */
export function dijkstraKernel(csr: Csr, vertexCount: number, source: number): Distances {
  const result = initialDistances(vertexCount, source);
  const { distances, predecessors } = result;
  const queue = new MinPriorityQueue();
  queue.push(source, 0);
  for (let entry = queue.pop(); entry !== undefined; entry = queue.pop()) {
    if (entry.priority > distances[entry.item]!) continue;
    for (let slot = csr.offsets[entry.item]!; slot < csr.offsets[entry.item + 1]!; slot++) {
      const target = csr.targets[slot]!;
      const candidate = entry.priority + csr.weights[slot]!;
      if (candidate >= distances[target]!) continue;
      distances[target] = candidate;
      predecessors[target] = entry.item;
      queue.push(target, candidate);
    }
  }
  return result;
}

/** Relaxes every arc once; returns whether anything changed. */
function relaxAll(csr: Csr, vertexCount: number, state: Distances): boolean {
  let changed = false;
  for (let vertex = 0; vertex < vertexCount; vertex++) {
    if (state.distances[vertex] === Infinity) continue;
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const target = csr.targets[slot]!;
      const candidate = state.distances[vertex]! + csr.weights[slot]!;
      if (candidate >= state.distances[target]!) continue;
      state.distances[target] = candidate;
      state.predecessors[target] = vertex;
      changed = true;
    }
  }
  return changed;
}

/** Bellman-Ford, O(V·E). Returns `undefined` when a negative cycle is reachable from `source`. */
export function bellmanFordKernel(
  csr: Csr,
  vertexCount: number,
  source: number,
): Distances | undefined {
  const state = initialDistances(vertexCount, source);
  for (let round = 1; round < vertexCount; round++) {
    if (!relaxAll(csr, vertexCount, state)) return state;
  }
  return relaxAll(csr, vertexCount, state) ? undefined : state;
}

function seedMatrix(csr: Csr, vertexCount: number): Float64Array {
  const matrix = new Float64Array(vertexCount * vertexCount).fill(Infinity);
  for (let vertex = 0; vertex < vertexCount; vertex++) {
    matrix[vertex * vertexCount + vertex] = 0;
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const cell = vertex * vertexCount + csr.targets[slot]!;
      matrix[cell] = Math.min(matrix[cell]!, csr.weights[slot]!);
    }
  }
  return matrix;
}

function relaxVia(matrix: Float64Array, size: number, via: number): void {
  for (let from = 0; from < size; from++) {
    for (let to = 0; to < size; to++) {
      const detour = matrix[from * size + via]! + matrix[via * size + to]!;
      if (detour < matrix[from * size + to]!) matrix[from * size + to] = detour;
    }
  }
}

/** Floyd-Warshall, O(V³). Row-major V×V matrix; a negative diagonal entry means a negative cycle. */
export function floydWarshallKernel(csr: Csr, vertexCount: number): Float64Array {
  const matrix = seedMatrix(csr, vertexCount);
  for (let via = 0; via < vertexCount; via++) relaxVia(matrix, vertexCount, via);
  return matrix;
}

export function distanceAt(distances: Float64Array, index: number): number {
  return distances[index]!;
}

export function matrixCell(matrix: Float64Array, cell: number): number {
  return matrix[cell]!;
}

export function hasNegativeDiagonal(matrix: Float64Array, size: number): boolean {
  return Array.from({ length: size }, (_, index) => matrixCell(matrix, index * size + index)).some(
    (value) => value < 0,
  );
}

/** Source→target index path from a predecessor array. */
export function traceBack(predecessors: Int32Array, target: number): number[] {
  const path = [target];
  for (let node = predecessors[target]!; node !== -1; node = predecessors[node]!) path.push(node);
  return path.toReversed();
}
