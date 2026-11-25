import type { Csr } from '@graph-toolkit/core';

interface Search {
  readonly csr: Csr;
  readonly visited: Uint8Array;
  readonly path: number[];
  readonly mustClose: boolean;
}

function extend(search: Search): boolean {
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
    if (visited[next] === 1) continue;
    visited[next] = 1;
    path.push(next);
    if (extend(search)) return true;
    path.pop();
    visited[next] = 0;
  }
  return false;
}

/** Backtracking, exponential in V. Returns a Hamiltonian path (or cycle) as indices. */
export function hamiltonian(
  csr: Csr,
  vertexCount: number,
  mustClose: boolean,
): number[] | undefined {
  const starts = mustClose ? [0] : Array.from({ length: vertexCount }, (_, vertex) => vertex);
  for (const start of starts.slice(0, vertexCount)) {
    const visited = new Uint8Array(vertexCount);
    visited[start] = 1;
    const search: Search = { csr, visited, path: [start], mustClose };
    if (extend(search)) return search.path;
  }
  return undefined;
}
