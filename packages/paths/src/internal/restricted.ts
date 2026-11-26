import type { Csr } from '@graph-sdk/core';
import { MinPriorityQueue } from '@graph-sdk/math';

export interface Restrictions {
  readonly blockedVertices: ReadonlySet<number>;
  readonly blockedSlots: ReadonlySet<number>;
  /** Admissible, consistent estimate to the target (A*); omitted means Dijkstra. */
  readonly heuristic?: (vertex: number) => number;
}

export interface IndexPath {
  readonly cost: number;
  readonly path: readonly number[];
}

export const NO_RESTRICTIONS: Restrictions = {
  blockedVertices: new Set(),
  blockedSlots: new Set(),
};

export interface Endpoints {
  readonly source: number;
  readonly target: number;
}

function unwind(predecessors: Int32Array, target: number): number[] {
  const path = [target];

  for (let node = predecessors[target]!; node !== -1; node = predecessors[node]!) {
    path.push(node);
  }

  return path.toReversed();
}

interface Search {
  readonly csr: Csr;
  readonly restrictions: Restrictions;
  readonly distances: Float64Array;
  readonly predecessors: Int32Array;
  readonly queue: MinPriorityQueue;
  readonly estimate: (vertex: number) => number;
}

function relax(search: Search, vertex: number): void {
  const { csr, distances, restrictions } = search;

  for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
    const next = csr.targets[slot]!;
    const cost = distances[vertex]! + csr.weights[slot]!;
    const isBlocked = restrictions.blockedSlots.has(slot) || restrictions.blockedVertices.has(next);

    if (isBlocked || cost >= distances[next]!) {
      continue;
    }

    distances[next] = cost;
    search.predecessors[next] = vertex;
    search.queue.push(next, cost + search.estimate(next));
  }
}

function newSearch(csr: Csr, source: number, restrictions: Restrictions): Search {
  const count = csr.offsets.length - 1;
  const search: Search = {
    csr,
    restrictions,
    distances: new Float64Array(count).fill(Infinity),
    predecessors: new Int32Array(count).fill(-1),
    queue: new MinPriorityQueue(),
    estimate: restrictions.heuristic ?? (() => 0),
  };

  search.distances[source] = 0;
  search.queue.push(source, search.estimate(source));

  return search;
}

/** Dijkstra (or A*) from `source` to `target` ignoring blocked vertices/arcs. O((V + E) log V). */
export function restrictedDijkstra(
  csr: Csr,
  endpoints: Endpoints,
  restrictions: Restrictions,
): IndexPath | undefined {
  const search = newSearch(csr, endpoints.source, restrictions);

  for (let entry = search.queue.pop(); entry !== undefined; entry = search.queue.pop()) {
    if (entry.priority > search.distances[entry.item]! + search.estimate(entry.item)) {
      continue;
    }

    if (entry.item === endpoints.target) {
      break;
    }

    relax(search, entry.item);
  }

  const cost = search.distances[endpoints.target]!;

  return cost === Infinity
    ? undefined
    : { cost, path: unwind(search.predecessors, endpoints.target) };
}

/** Slot of the arc `from → to`; the arc must exist. */
export function arcSlot(csr: Csr, from: number, to: number): number {
  const start = csr.offsets[from]!;

  return start + csr.targets.subarray(start, csr.offsets[from + 1]).indexOf(to);
}

export function pathCost(csr: Csr, path: readonly number[]): number {
  let total = 0;

  for (let index = 1; index < path.length; index++) {
    total += csr.weights[arcSlot(csr, path[index - 1]!, path[index]!)]!;
  }

  return total;
}
