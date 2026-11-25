import type { Csr } from '@graph-toolkit/core';

/** Breadth-first order of vertex indices reachable from `start`, O(V + E). */
export function bfsOrder(csr: Csr, start: number, visited: Uint8Array): number[] {
  const order = [start];
  visited[start] = 1;
  for (let head = 0; head < order.length; head++) {
    const vertex = order[head]!;
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const target = csr.targets[slot]!;
      if (visited[target] === 1) continue;
      visited[target] = 1;
      order.push(target);
    }
  }
  return order;
}

/** Iterative depth-first preorder from `start`, O(V + E). */
export function dfsOrder(csr: Csr, start: number, visited: Uint8Array): number[] {
  const order: number[] = [];
  const stack = [start];
  while (stack.length > 0) {
    const vertex = stack.pop()!;
    if (visited[vertex] === 1) continue;
    visited[vertex] = 1;
    order.push(vertex);
    for (let slot = csr.offsets[vertex + 1]! - 1; slot >= csr.offsets[vertex]!; slot--) {
      stack.push(csr.targets[slot]!);
    }
  }
  return order;
}

function inDegrees(csr: Csr, vertexCount: number): Uint32Array {
  const inDegree = new Uint32Array(vertexCount);
  for (const target of csr.targets) inDegree[target]!++;
  return inDegree;
}

/** Kahn's algorithm. Returns indices in topological order, or fewer than V entries on a cycle. */
export function kahnOrder(csr: Csr, vertexCount: number): number[] {
  const inDegree = inDegrees(csr, vertexCount);
  const order = Array.from({ length: vertexCount }, (_, vertex) => vertex).filter(
    (vertex) => inDegree[vertex] === 0,
  );
  for (let head = 0; head < order.length; head++) {
    const vertex = order[head]!;
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      const target = csr.targets[slot]!;
      inDegree[target]!--;
      if (inDegree[target] === 0) order.push(target);
    }
  }
  return order;
}

/** Groups of mutually reachable indices for a symmetric CSR, O(V + E). */
export function componentIndices(csr: Csr, vertexCount: number): number[][] {
  const visited = new Uint8Array(vertexCount);
  const components: number[][] = [];
  for (let vertex = 0; vertex < vertexCount; vertex++) {
    if (visited[vertex] === 0) components.push(bfsOrder(csr, vertex, visited));
  }
  return components;
}
