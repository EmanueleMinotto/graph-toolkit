import type { Csr } from '@graph-sdk/core';

export interface Parents {
  readonly parent: Int32Array;
  readonly depth: Int32Array;
}

/** BFS parents (-1 for the root) and depths from `root`. */
export function rootAt(csr: Csr, vertexCount: number, root: number): Parents {
  const parent = new Int32Array(vertexCount).fill(-1);
  const depth = new Int32Array(vertexCount);
  const queue = [root];
  const seen = new Uint8Array(vertexCount);

  seen[root] = 1;

  for (let head = 0; head < queue.length; head++) {
    const vertex = queue[head]!;

    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const next = csr.targets[slot]!;

      if (seen[next] === 1) {
        continue;
      }

      seen[next] = 1;
      parent[next] = vertex;
      depth[next] = depth[vertex]! + 1;
      queue.push(next);
    }
  }

  return { parent, depth };
}

const jump = (below: Int32Array): Int32Array => below.map((middle) => below[middle]!);

export function valueAt(values: Int32Array, index: number): number {
  return values[index]!;
}

const levelCount = (count: number): number => Math.ceil(Math.log2(Math.max(count, 2)));

/** Binary-lifting ancestors: `table[k][v]` is the 2^k-th ancestor of `v` (root maps to itself). */
export function liftingTable(parents: Parents): Int32Array[] {
  const count = parents.parent.length;
  const levels = levelCount(count);
  const first = parents.parent.map((ancestor, vertex) => (ancestor === -1 ? vertex : ancestor));
  const table: Int32Array[] = [first];

  for (let level = 1; level < levels; level++) {
    table.push(jump(table[level - 1]!));
  }

  return table;
}

function lift(table: readonly Int32Array[], vertex: number, steps: number): number {
  let current = vertex;

  for (let level = 0; level < table.length; level++) {
    if ((steps >> level) & 1) {
      current = table[level]![current]!;
    }
  }

  return current;
}

/** Lowest common ancestor in O(log V). */
export function lowestCommonAncestor(
  table: readonly Int32Array[],
  depth: Int32Array,
  pair: readonly [number, number],
): number {
  const [deeper, other] = depth[pair[0]]! >= depth[pair[1]]! ? pair : [pair[1], pair[0]];
  let left = lift(table, deeper, depth[deeper]! - depth[other]!);
  let right = other;

  if (left === right) {
    return left;
  }

  for (let level = table.length - 1; level >= 0; level--) {
    if (table[level]![left] === table[level]![right]) {
      continue;
    }

    left = table[level]![left]!;
    right = table[level]![right]!;
  }

  return table[0]![left]!;
}
