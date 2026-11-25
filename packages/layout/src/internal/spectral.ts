import type { Csr } from '@graph-toolkit/core';

/** Row-major Laplacian D − A of the symmetrized, loop-free, unweighted graph. */
export function symmetricLaplacian(csr: Csr, count: number): Float64Array {
  const around = Array.from({ length: count }, () => new Set<number>());
  for (let vertex = 0; vertex < count; vertex++) {
    const targets = csr.targets.subarray(csr.offsets[vertex], csr.offsets[vertex + 1]);
    for (const target of targets) {
      if (target === vertex) continue;
      around[vertex]!.add(target);
      around[target]!.add(vertex);
    }
  }
  const data = new Float64Array(count * count);
  for (const [vertex, neighbors] of around.entries()) {
    data[vertex * count + vertex] = neighbors.size;
    for (const target of neighbors) data[vertex * count + target] = -1;
  }
  return data;
}
