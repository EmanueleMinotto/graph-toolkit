import type { Csr } from '@graph-sdk/core';

export interface Rings {
  /** Ring number per vertex; unreachable vertices share the outermost ring. */
  readonly ring: Int32Array;
  /** Position of each vertex within its ring. */
  readonly rank: Int32Array;
  /** Number of vertices on each ring. */
  readonly sizes: Int32Array;
}

function hops(csr: Csr, count: number, root: number): Int32Array {
  const depth = new Int32Array(count).fill(-1);
  depth[root] = 0;
  const queue = [root];
  for (let head = 0; head < queue.length; head++) {
    const vertex = queue[head]!;
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const target = csr.targets[slot]!;
      if (depth[target] !== -1) {
        continue;
      }
      depth[target] = depth[vertex]! + 1;
      queue.push(target);
    }
  }
  return depth;
}

/** BFS rings around `root`; vertices not reached form one extra outer ring. */
export function ringsAround(csr: Csr, count: number, root: number): Rings {
  const ring = hops(csr, count, root);
  const outer = Math.max(...ring) + 1;
  const sizes = new Int32Array(outer + 1);
  const rank = new Int32Array(count);
  for (let vertex = 0; vertex < count; vertex++) {
    if (ring[vertex] === -1) {
      ring[vertex] = outer;
    }
    rank[vertex] = sizes[ring[vertex]!]!++;
  }
  return { ring, rank, sizes };
}
