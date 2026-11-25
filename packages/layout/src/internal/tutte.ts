import type { Csr } from '@graph-toolkit/core';

const MAX_CANDIDATES = 200;
const SWEEPS = 1000;
const TOLERANCE = 1e-9;
const OUTSIDE_RADIUS = 1.5;

type Lists = readonly (readonly number[])[];
type Point = readonly [number, number];

function neighborLists(csr: Csr, count: number): number[][] {
  const lists = Array.from({ length: count }, (): number[] => []);
  for (let vertex = 0; vertex < count; vertex++) {
    const targets = csr.targets.subarray(csr.offsets[vertex], csr.offsets[vertex + 1]);
    for (const target of targets) {
      if (target === vertex) continue;
      lists[vertex]!.push(target);
      lists[target]!.push(vertex);
    }
  }
  return lists;
}

/** BFS parents from `from`, never crossing the edge `from`–`to` itself. */
function parentsAvoiding(lists: Lists, [from, to]: Point): Map<number, number> {
  const parent = new Map<number, number>([[from, -1]]);
  const queue = [from];
  for (let head = 0; head < queue.length && !parent.has(to); head++) {
    const vertex = queue[head]!;
    const fresh = lists[vertex]!.filter((id) => !parent.has(id) && (id !== to || vertex !== from));
    for (const candidate of fresh) {
      parent.set(candidate, vertex);
      queue.push(candidate);
    }
  }
  return parent;
}

/** Shortest cycle through the edge `from`–`to` as a vertex list, or an empty array. */
function cycleThrough(lists: Lists, edge: Point): number[] {
  const parent = parentsAvoiding(lists, edge);
  const path: number[] = [];
  for (let vertex = edge[1]; vertex !== -1 && parent.has(vertex); vertex = parent.get(vertex)!) {
    path.push(vertex);
  }
  return parent.has(edge[1]) ? path : [];
}

/** The longest among the shortest cycles through the first edges: a roomy outer face. */
export function outerCycle(csr: Csr, count: number): number[] {
  const lists = neighborLists(csr, count);
  const edges = lists.flatMap((around, from) =>
    around.filter((to) => to > from).map((to): Point => [from, to]),
  );
  return edges
    .slice(0, MAX_CANDIDATES)
    .map((edge) => cycleThrough(lists, edge))
    .reduce((best, cycle) => (cycle.length > best.length ? cycle : best), []);
}

function meanOf(position: Float64Array, around: readonly number[], axis: number): number {
  return around.reduce((sum, next) => sum + position[2 * next + axis]!, 0) / around.length;
}

/** Moves `vertex` to the mean of its neighbors; returns how far it went. */
function settle(position: Float64Array, vertex: number, around: readonly number[]): number {
  const [x, y] = [meanOf(position, around, 0), meanOf(position, around, 1)];
  const moved = Math.max(
    Math.abs(x - position[2 * vertex]!),
    Math.abs(y - position[2 * vertex + 1]!),
  );
  [position[2 * vertex], position[2 * vertex + 1]] = [x, y];
  return moved;
}

/** Barycentric relaxation: each free vertex moves to the mean of its neighbors until it settles. */
function relax(lists: Lists, count: number, fixed: ReadonlyMap<number, Point>): Float64Array {
  const position = new Float64Array(2 * count);
  for (const [vertex, [x, y]] of fixed) [position[2 * vertex], position[2 * vertex + 1]] = [x, y];
  const free = [...lists.keys()].filter(
    (vertex) => !fixed.has(vertex) && lists[vertex]!.length > 0,
  );
  for (let sweep = 0; sweep < SWEEPS; sweep++) {
    const moved = free.map((vertex) => settle(position, vertex, lists[vertex]!));
    if (Math.max(0, ...moved) < TOLERANCE) break;
  }
  return position;
}

/** Vertices with no path to any of `seeds`. */
function cutOff(lists: Lists, seeds: readonly number[]): number[] {
  const reached = new Set(seeds);
  const queue = [...seeds];
  for (let head = 0; head < queue.length; head++) {
    const fresh = lists[queue[head]!]!.filter((next) => !reached.has(next));
    const unique = new Set(fresh);
    for (const next of unique) {
      reached.add(next);
      queue.push(next);
    }
  }
  return lists
    .keys()
    .filter((vertex) => !reached.has(vertex))
    .toArray();
}

const onRing = (vertices: readonly number[], radius: number): [number, Point][] =>
  vertices.map((vertex, index) => {
    const angle = (2 * Math.PI * index) / vertices.length;
    return [vertex, [radius * Math.cos(angle), radius * Math.sin(angle)]];
  });

/** Tutte positions as x, y pairs: `cycle` on the unit circle, cut-off vertices on an outer ring. */
export function tutteEmbedding(csr: Csr, count: number, cycle: readonly number[]): Float64Array {
  const lists = neighborLists(csr, count);
  const fixed = new Map([...onRing(cycle, 1), ...onRing(cutOff(lists, cycle), OUTSIDE_RADIUS)]);
  return relax(lists, count, fixed);
}
