import type { Csr } from '@graph-sdk/core';

interface Forest {
  readonly csr: Csr;
  readonly mate: Int32Array;
  readonly parent: Int32Array;
  readonly base: Int32Array;
  readonly inTree: Uint8Array;
  readonly inBlossom: Uint8Array;
  readonly queue: number[];
}

function commonBase(forest: Forest, left: number, right: number): number {
  const seen = new Uint8Array(forest.mate.length);
  for (
    let vertex = forest.base[left]!;
    ;
    vertex = forest.base[forest.parent[forest.mate[vertex]!]!]!
  ) {
    seen[vertex] = 1;
    if (forest.mate[vertex] === -1) break;
  }
  for (
    let vertex = forest.base[right]!;
    ;
    vertex = forest.base[forest.parent[forest.mate[vertex]!]!]!
  ) {
    if (seen[vertex] === 1) return vertex;
  }
}

interface Branch {
  readonly start: number;
  readonly top: number;
  readonly child: number;
}

function markPath(forest: Forest, branch: Branch): void {
  let [vertex, link] = [branch.start, branch.child];
  while (forest.base[vertex] !== branch.top) {
    const mate = forest.mate[vertex]!;
    forest.inBlossom[forest.base[vertex]!] = 1;
    forest.inBlossom[forest.base[mate]!] = 1;
    forest.parent[vertex] = link;
    link = mate;
    vertex = forest.parent[mate]!;
  }
}

function contract(forest: Forest, vertex: number, other: number): void {
  const top = commonBase(forest, vertex, other);
  forest.inBlossom.fill(0);
  markPath(forest, { start: vertex, top, child: other });
  markPath(forest, { start: other, top, child: vertex });
  for (let index = 0; index < forest.base.length; index++) {
    if (forest.inBlossom[forest.base[index]!] === 0) continue;
    forest.base[index] = top;
    if (forest.inTree[index] === 1) continue;
    forest.inTree[index] = 1;
    forest.queue.push(index);
  }
}

/** Grows the tree through `other`; returns the free vertex ending an augmenting path, or -1. */
function grow(forest: Forest, vertex: number, other: number): number {
  forest.parent[other] = vertex;
  const mate = forest.mate[other]!;
  if (mate === -1) return other;
  forest.inTree[mate] = 1;
  forest.queue.push(mate);
  return -1;
}

function isOddInTree(forest: Forest, vertex: number): boolean {
  const mate = forest.mate[vertex]!;
  return mate !== -1 && forest.parent[mate] !== -1;
}

/** Handles edge vertex→other; returns the free vertex ending an augmenting path, or -1. */
function explore(forest: Forest, [vertex, other]: readonly [number, number], root: number): number {
  if (forest.base[vertex] === forest.base[other] || forest.mate[vertex] === other) return -1;
  if (other === root || isOddInTree(forest, other)) {
    contract(forest, vertex, other);
    return -1;
  }
  return forest.parent[other] === -1 ? grow(forest, vertex, other) : -1;
}

function visit(forest: Forest, vertex: number, root: number): number {
  const { csr } = forest;
  for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
    const end = explore(forest, [vertex, csr.targets[slot]!], root);
    if (end !== -1) return end;
  }
  return -1;
}

function findPath(forest: Forest, root: number): number {
  forest.parent.fill(-1);
  forest.inTree.fill(0);
  forest.base.set([...forest.base.keys()]);
  forest.inTree[root] = 1;
  forest.queue.length = 0;
  forest.queue.push(root);
  for (let head = 0; head < forest.queue.length; head++) {
    const end = visit(forest, forest.queue[head]!, root);
    if (end !== -1) return end;
  }
  return -1;
}

function augment(forest: Forest, end: number): void {
  for (let vertex = end; vertex !== -1;) {
    const previous = forest.parent[vertex]!;
    const next = forest.mate[previous]!;
    forest.mate[vertex] = previous;
    forest.mate[previous] = vertex;
    vertex = next;
  }
}

/** Edmonds' blossom algorithm, O(V·E) per augmentation. Returns the mate of each vertex (-1 if free). */
export function blossomMatching(csr: Csr, count: number): Int32Array {
  const forest: Forest = {
    csr,
    mate: new Int32Array(count).fill(-1),
    parent: new Int32Array(count),
    base: new Int32Array(count),
    inTree: new Uint8Array(count),
    inBlossom: new Uint8Array(count),
    queue: [],
  };
  for (let root = 0; root < count; root++) {
    if (forest.mate[root] !== -1) continue;
    const end = findPath(forest, root);
    if (end !== -1) augment(forest, end);
  }
  return forest.mate;
}
