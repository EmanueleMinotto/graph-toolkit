import type { Csr } from '@graph-sdk/core';
import { DisjointSet, MinPriorityQueue } from '@graph-sdk/math';

export interface IndexEdge {
  readonly source: number;
  readonly target: number;
  readonly weight: number;
}

function sourcesOfSlots(csr: Csr): Int32Array {
  const sources = new Int32Array(csr.targets.length);
  for (let vertex = 0; vertex + 1 < csr.offsets.length; vertex++) {
    sources.fill(vertex, csr.offsets[vertex], csr.offsets[vertex + 1]);
  }
  return sources;
}

interface Growth {
  readonly csr: Csr;
  readonly visited: Uint8Array;
  readonly sources: Int32Array;
}

function growTree({ csr, visited, sources }: Growth, start: number): IndexEdge[] {
  const edges: IndexEdge[] = [];
  const queue = new MinPriorityQueue();
  const enqueueArcs = (vertex: number): void => {
    visited[vertex] = 1;
    for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
      if (visited[csr.targets[slot]!] === 0) queue.push(slot, csr.weights[slot]!);
    }
  };
  enqueueArcs(start);
  for (let entry = queue.pop(); entry !== undefined; entry = queue.pop()) {
    const target = csr.targets[entry.item]!;
    if (visited[target] === 1) continue;
    edges.push({ source: sources[entry.item]!, target, weight: entry.priority });
    enqueueArcs(target);
  }
  return edges;
}

/** Prim over every component, O(E log V). */
export function primKernel(csr: Csr, vertexCount: number): IndexEdge[] {
  const visited = new Uint8Array(vertexCount);
  const sources = sourcesOfSlots(csr);
  const edges: IndexEdge[] = [];
  for (let start = 0; start < vertexCount; start++) {
    if (visited[start] === 0) edges.push(...growTree({ csr, visited, sources }, start));
  }
  return edges;
}

function cheapestPerComponent(edges: readonly IndexEdge[], sets: DisjointSet): Map<number, number> {
  const cheapest = new Map<number, number>();
  for (const [id, edge] of edges.entries()) {
    const [left, right] = [sets.find(edge.source), sets.find(edge.target)];
    if (left === right) continue;
    for (const root of [left, right]) {
      const current = cheapest.get(root);
      if (current === undefined || edge.weight < edges[current]!.weight) cheapest.set(root, id);
    }
  }
  return cheapest;
}

/** Borůvka, O(E log V). Ties go to the lower edge index, so no round can close a cycle. */
export function boruvkaKernel(vertexCount: number, edges: readonly IndexEdge[]): IndexEdge[] {
  const sets = new DisjointSet(vertexCount);
  const chosen: IndexEdge[] = [];
  for (let ids = roundEdges(edges, sets); ids.length > 0; ids = roundEdges(edges, sets)) {
    for (const id of ids) {
      const edge = edges[id]!;
      sets.union(edge.source, edge.target);
      chosen.push(edge);
    }
  }
  return chosen;
}

function roundEdges(edges: readonly IndexEdge[], sets: DisjointSet): number[] {
  return [...new Set(cheapestPerComponent(edges, sets).values())];
}
