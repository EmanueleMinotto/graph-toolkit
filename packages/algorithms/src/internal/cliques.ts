import type { AbortSignalLike, Csr } from '@graph-sdk/core';

function neighborsOf(csr: Csr, vertex: number): Set<number> {
  return new Set(csr.targets.subarray(csr.offsets[vertex], csr.offsets[vertex + 1]));
}

interface Frame {
  readonly adjacency: readonly Set<number>[];
  readonly found: number[][];
  readonly signal: AbortSignalLike | undefined;
}

function pivotOf(
  frame: Frame,
  candidates: ReadonlySet<number>,
  excluded: ReadonlySet<number>,
): number {
  const overlap = (vertex: number): number =>
    frame.adjacency[vertex]!.intersection(candidates).size;
  const pool = [...candidates, ...excluded];
  return pool.toSorted((left, right) => overlap(right) - overlap(left))[0]!;
}

interface Sets {
  readonly candidates: Set<number>;
  readonly excluded: Set<number>;
}

interface Node {
  readonly clique: readonly number[];
  readonly sets: Sets;
}

function branch(frame: Frame, { clique, sets }: Node, vertex: number): void {
  const around = frame.adjacency[vertex]!;
  expand(frame, [...clique, vertex], {
    candidates: sets.candidates.intersection(around),
    excluded: sets.excluded.intersection(around),
  });
  sets.candidates.delete(vertex);
  sets.excluded.add(vertex);
}

function expand(frame: Frame, clique: readonly number[], sets: Sets): void {
  frame.signal?.throwIfAborted();
  if (sets.candidates.size === 0 && sets.excluded.size === 0) {
    frame.found.push([...clique]);
    return;
  }
  const pivot = pivotOf(frame, sets.candidates, sets.excluded);
  const branching = sets.candidates.difference(frame.adjacency[pivot]!);
  for (const vertex of branching) {
    branch(frame, { clique, sets }, vertex);
  }
}

/** Bron–Kerbosch with pivoting; loops are ignored. Output size can be exponential. */
export function maximalCliqueKernel(
  csr: Csr,
  vertexCount: number,
  signal?: AbortSignalLike,
): number[][] {
  const adjacency = Array.from({ length: vertexCount }, (_, vertex) => neighborsOf(csr, vertex));
  for (const [vertex, around] of adjacency.entries()) {
    around.delete(vertex);
  }
  const frame: Frame = { adjacency, found: [], signal };
  const all = new Set(Array.from({ length: vertexCount }, (_, vertex) => vertex));
  if (vertexCount > 0) {
    expand(frame, [], { candidates: all, excluded: new Set() });
  }
  return frame.found;
}
