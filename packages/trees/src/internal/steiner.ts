import type { Csr, Edge, VertexId } from '@graph-sdk/core';
import { DisjointSet, MinPriorityQueue } from '@graph-sdk/math';

export interface Paths {
  readonly distance: Float64Array;
  /** Previous vertex on the shortest path, -1 at the source and when unreachable. */
  readonly previous: Int32Array;
}

type Pair = readonly [number, number];

/** Dijkstra with a lazy-deletion heap; weights must be non-negative. */
export function shortestPaths(csr: Csr, source: number): Paths {
  const count = csr.offsets.length - 1;
  const distance = new Float64Array(count).fill(Infinity);
  const previous = new Int32Array(count).fill(-1);

  distance[source] = 0;
  const queue = new MinPriorityQueue();

  queue.push(source, 0);

  for (let entry = queue.pop(); entry !== undefined; entry = queue.pop()) {
    if (entry.priority > distance[entry.item]!) {
      continue;
    }

    for (let slot = csr.offsets[entry.item]!; slot < csr.offsets[entry.item + 1]!; slot++) {
      const target = csr.targets[slot]!;
      const candidate = entry.priority + csr.weights[slot]!;

      if (candidate >= distance[target]!) {
        continue;
      }

      distance[target] = candidate;
      previous[target] = entry.item;
      queue.push(target, candidate);
    }
  }

  return { distance, previous };
}

/** Cheapest pair (joined terminal, outside terminal) by shortest-path distance, if any is finite. */
function cheapestLink(
  distances: readonly Paths[],
  terminals: readonly number[],
  joined: ReadonlySet<number>,
): Pair | undefined {
  let best: Pair | undefined;
  let cost = Infinity;

  for (const from of joined) {
    for (const [to, vertex] of terminals.entries()) {
      const length = distances[from]!.distance[vertex]!;

      if (!joined.has(to) && length < cost) {
        [best, cost] = [[from, to], length];
      }
    }
  }

  return best;
}

/** Prim on the complete graph over `terminals`; index pairs into `terminals`, or `undefined`. */
export function terminalTree(
  distances: readonly Paths[],
  terminals: readonly number[],
): Pair[] | undefined {
  const joined = new Set([0]);
  const pairs: Pair[] = [];

  while (joined.size < terminals.length) {
    const link = cheapestLink(distances, terminals, joined);

    if (link === undefined) {
      return undefined;
    }

    joined.add(link[1]);
    pairs.push(link);
  }

  return pairs;
}

/** Vertex pairs along the shortest path from `paths`' source to `target`. */
export function pathPairs(paths: Paths, target: number): Pair[] {
  const pairs: Pair[] = [];

  for (let vertex = target; paths.previous[vertex] !== -1; vertex = paths.previous[vertex]!) {
    pairs.push([paths.previous[vertex]!, vertex]);
  }

  return pairs;
}

/** Minimum spanning forest (Kruskal) of the subgraph made of `edges`. */
export function kruskal(
  edges: readonly Edge[],
  indexOf: (id: VertexId) => number,
  size: number,
): Edge[] {
  const sets = new DisjointSet(size);

  return edges
    .toSorted((left, right) => left.weight - right.weight)
    .filter((edge) => sets.union(indexOf(edge.source), indexOf(edge.target)));
}

/** Removes non-terminal leaves until every leaf is a terminal. */
export function prune(edges: readonly Edge[], terminals: ReadonlySet<VertexId>): Edge[] {
  const kept = [...edges];

  for (;;) {
    const degree = Map.groupBy(
      kept.flatMap((edge) => [edge.source, edge.target]),
      (id) => id,
    );
    const isDangling = (id: VertexId): boolean =>
      degree.get(id)!.length === 1 && !terminals.has(id);
    const leaf = kept.findIndex((edge) => isDangling(edge.source) || isDangling(edge.target));

    if (leaf === -1) {
      return kept;
    }

    kept.splice(leaf, 1);
  }
}

const pairKey = (from: number, to: number): string =>
  `${String(Math.min(from, to))}:${String(Math.max(from, to))}`;

/** Keys (`low:high`) of every edge on the shortest paths that realise the terminal tree. */
export function usedEdgeKeys(
  paths: readonly Paths[],
  wanted: readonly number[],
  links: readonly Pair[],
): Set<string> {
  return new Set(
    links.flatMap(([from, to]) =>
      pathPairs(paths[from]!, wanted[to]!).map(([a, b]) => pairKey(a, b)),
    ),
  );
}

/** Same key format as `usedEdgeKeys`, for an edge of the graph. */
export const edgeKeyOf = (edge: Edge, indexOf: (id: VertexId) => number): string =>
  pairKey(indexOf(edge.source), indexOf(edge.target));
