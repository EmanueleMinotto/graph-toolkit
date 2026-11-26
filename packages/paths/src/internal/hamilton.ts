import type { AbortSignalLike, Csr } from '@graph-sdk/core';

interface Search {
  readonly csr: Csr;
  readonly visited: Uint8Array;
  readonly path: number[];
  readonly mustClose: boolean;
  readonly signal: AbortSignalLike | undefined;
}

function step(search: Search): boolean {
  const { csr, visited, path } = search;
  const last = path.at(-1)!;
  if (path.length === visited.length) {
    return (
      !search.mustClose ||
      csr.targets.slice(csr.offsets[last], csr.offsets[last + 1]).includes(path[0]!)
    );
  }
  for (let slot = csr.offsets[last]!; slot < csr.offsets[last + 1]!; slot++) {
    const next = csr.targets[slot]!;
    if (visited[next] === 1) {
      continue;
    }
    visited[next] = 1;
    path.push(next);
    if (extend(search)) {
      return true;
    }
    path.pop();
    visited[next] = 0;
  }
  return false;
}

function extend(search: Search): boolean {
  search.signal?.throwIfAborted();
  return step(search);
}

/** Backtracking, exponential in V. Returns a Hamiltonian path (or cycle) as indices. */
export interface Mode {
  readonly mustClose: boolean;
  readonly signal: AbortSignalLike | undefined;
}

export function hamiltonian(csr: Csr, vertexCount: number, mode: Mode): number[] | undefined {
  const { mustClose, signal } = mode;
  const starts = mustClose ? [0] : Array.from({ length: vertexCount }, (_, vertex) => vertex);
  for (const start of starts.slice(0, vertexCount)) {
    const visited = new Uint8Array(vertexCount);
    visited[start] = 1;
    const search: Search = { csr, visited, path: [start], mustClose, signal };
    if (extend(search)) {
      return search.path;
    }
  }
  return undefined;
}
