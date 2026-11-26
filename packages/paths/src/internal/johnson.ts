import type { Csr } from '@graph-sdk/core';
import { dijkstraKernel, type Distances } from './shortest.js';

function relaxRound(csr: Csr, height: Float64Array): boolean {
  let changed = false;

  for (let vertex = 0; vertex < height.length; vertex++) {
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const candidate = height[vertex]! + csr.weights[slot]!;

      if (candidate >= height[csr.targets[slot]!]!) {
        continue;
      }

      height[csr.targets[slot]!] = candidate;
      changed = true;
    }
  }

  return changed;
}

/** Bellman-Ford potentials from a virtual source; `undefined` when a negative cycle exists. */
export function potentials(csr: Csr, count: number): Float64Array | undefined {
  const height = new Float64Array(count);

  for (let round = 0; round <= count; round++) {
    if (!relaxRound(csr, height)) {
      return height;
    }
  }

  return undefined;
}

/** Same topology, weights w(u, v) + h(u) − h(v) ≥ 0. */
function reweighted(csr: Csr, height: Float64Array): Csr {
  const weights = new Float64Array(csr.weights.length);

  for (let vertex = 0; vertex < height.length; vertex++) {
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      weights[slot] = csr.weights[slot]! + height[vertex]! - height[csr.targets[slot]!]!;
    }
  }

  return { offsets: csr.offsets, targets: csr.targets, weights };
}

/** Johnson all-pairs, O(V·E log V). Row-major V×V, or `undefined` on a negative cycle. */
export function johnsonKernel(csr: Csr, count: number): Float64Array | undefined {
  const height = potentials(csr, count);

  if (height === undefined) {
    return undefined;
  }

  const positive = reweighted(csr, height);
  const cells = new Float64Array(count * count);

  for (let source = 0; source < count; source++) {
    const { distances } = dijkstraKernel(positive, count, source);

    for (let target = 0; target < count; target++) {
      cells[source * count + target] = distances[target]! + height[target]! - height[source]!;
    }
  }

  return cells;
}

/** Relaxes arcs in topological order; handles negative weights, O(V + E). */
export function dagKernel(csr: Csr, order: readonly number[], source: number): Distances {
  const distances = new Float64Array(order.length).fill(Infinity);
  const predecessors = new Int32Array(order.length).fill(-1);

  distances[source] = 0;

  for (const vertex of order) {
    if (distances[vertex] === Infinity) {
      continue;
    }

    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const target = csr.targets[slot]!;
      const candidate = distances[vertex]! + csr.weights[slot]!;

      if (candidate >= distances[target]!) {
        continue;
      }

      distances[target] = candidate;
      predecessors[target] = vertex;
    }
  }

  return { distances, predecessors };
}
