import { MinPriorityQueue } from '@graph-sdk/math';
import type { IndexEdge } from './spanning.js';

function degreesOf(vertexCount: number, edges: readonly IndexEdge[]) {
  const degree = new Int32Array(vertexCount);
  const neighborXor = new Int32Array(vertexCount);

  for (const { source, target } of edges) {
    degree[source]!++;
    degree[target]!++;
    neighborXor[source]! ^= target;
    neighborXor[target]! ^= source;
  }

  return { degree, neighborXor };
}

function leavesOf(degree: Int32Array): MinPriorityQueue {
  const leaves = new MinPriorityQueue();

  for (const [vertex, count] of degree.entries()) {
    if (count === 1) {
      leaves.push(vertex, vertex);
    }
  }

  return leaves;
}

/** Prüfer sequence of a tree on `edges` (n ≥ 2 vertices), O(n log n). */
export function encodePrufer(vertexCount: number, edges: readonly IndexEdge[]): number[] {
  const { degree, neighborXor } = degreesOf(vertexCount, edges);
  const leaves = leavesOf(degree);
  const code: number[] = [];

  for (let step = 0; step < vertexCount - 2; step++) {
    const leaf = leaves.pop()!.item;
    const neighbor = neighborXor[leaf]!;

    code.push(neighbor);
    neighborXor[neighbor]! ^= leaf;
    degree[neighbor]!--;

    if (degree[neighbor] === 1) {
      leaves.push(neighbor, neighbor);
    }
  }

  return code;
}

/** Edges of the tree with the given Prüfer sequence on `code.length + 2` vertices. */
export function decodePrufer(code: readonly number[]): [number, number][] {
  const count = code.length + 2;
  const degree = new Int32Array(count).fill(1);

  for (const vertex of code) {
    degree[vertex]!++;
  }

  const leaves = leavesOf(degree);
  const edges: [number, number][] = [];

  for (const vertex of code) {
    edges.push([leaves.pop()!.item, vertex]);
    degree[vertex]!--;

    if (degree[vertex] === 1) {
      leaves.push(vertex, vertex);
    }
  }

  edges.push([leaves.pop()!.item, leaves.pop()!.item]);

  return edges;
}

export function itemAt<T>(items: readonly T[], index: number): T {
  return items[index]!;
}
