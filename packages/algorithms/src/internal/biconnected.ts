export type Pair = readonly [number, number];

interface Walk {
  readonly adjacency: readonly (readonly number[])[];
  readonly discovery: Int32Array;
  readonly low: Int32Array;
  readonly parent: Int32Array;
  readonly cursor: Uint32Array;
  readonly edges: Pair[];
  readonly blocks: Pair[][];
  time: number;
}

function open(walk: Walk, vertex: number, parent: number): void {
  walk.discovery[vertex] = walk.time;
  walk.low[vertex] = walk.time;
  walk.time++;
  walk.parent[vertex] = parent;
}

function takeBlock(walk: Walk, top: Pair): void {
  const block: Pair[] = [];
  for (let edge = walk.edges.pop()!; ; edge = walk.edges.pop()!) {
    block.push(edge);
    if (edge[0] === top[0] && edge[1] === top[1]) break;
  }
  walk.blocks.push(block);
}

function descend(walk: Walk, calls: number[], [from, to]: Pair): void {
  if (walk.discovery[to] === -1) {
    open(walk, to, from);
    walk.edges.push([from, to]);
    calls.push(to);
    return;
  }
  if (walk.discovery[to]! >= walk.discovery[from]!) return;
  walk.edges.push([from, to]);
  walk.low[from] = Math.min(walk.low[from]!, walk.discovery[to]!);
}

function retreat(walk: Walk, calls: number[], vertex: number): void {
  calls.pop();
  const parent = walk.parent[vertex]!;
  if (parent === -1) return;
  walk.low[parent] = Math.min(walk.low[parent]!, walk.low[vertex]!);
  if (walk.low[vertex]! >= walk.discovery[parent]!) takeBlock(walk, [parent, vertex]);
}

function advance(walk: Walk, calls: number[]): void {
  const vertex = calls.at(-1)!;
  const neighbors = walk.adjacency[vertex]!;
  if (walk.cursor[vertex]! >= neighbors.length) {
    retreat(walk, calls, vertex);
    return;
  }
  const next = neighbors[walk.cursor[vertex]!++]!;
  if (next !== walk.parent[vertex]) descend(walk, calls, [vertex, next]);
}

/** Biconnected components as edge lists, iterative Tarjan, O(V + E). */
export function biconnectedBlocks(adjacency: readonly (readonly number[])[]): Pair[][] {
  const count = adjacency.length;
  const walk: Walk = {
    adjacency,
    discovery: new Int32Array(count).fill(-1),
    low: new Int32Array(count),
    parent: new Int32Array(count).fill(-1),
    cursor: new Uint32Array(count),
    edges: [],
    blocks: [],
    time: 0,
  };
  for (let root = 0; root < count; root++) {
    if (walk.discovery[root] !== -1) continue;
    open(walk, root, -1);
    const calls = [root];
    while (calls.length > 0) advance(walk, calls);
  }
  return walk.blocks;
}

/** Symmetric neighbor lists for `count` vertices; loops are dropped. */
export function symmetricAdjacency(count: number, edges: readonly Pair[]): number[][] {
  const adjacency: number[][] = Array.from({ length: count }, () => []);
  for (const [source, target] of edges) {
    if (source === target) continue;
    adjacency[source]!.push(target);
    adjacency[target]!.push(source);
  }
  return adjacency;
}
