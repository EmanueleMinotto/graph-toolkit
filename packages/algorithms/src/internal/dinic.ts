import type { Csr } from '@graph-sdk/core';
import { buildResidual, type Residual, type Terminals } from './flow.js';

function levelGraph(residual: Residual, terminals: Terminals): Int32Array {
  const level = new Int32Array(residual.adjacency.length).fill(-1);
  const queue = [terminals.source];

  level[terminals.source] = 0;

  for (let head = 0; head < queue.length; head++) {
    const vertex = queue[head]!;
    const edges = residual.adjacency[vertex]!;

    for (const edge of edges) {
      const next = residual.to[edge]!;

      if (level[next] !== -1 || residual.capacity[edge]! <= 0) {
        continue;
      }

      level[next] = level[vertex]! + 1;
      queue.push(next);
    }
  }

  return level;
}

interface Blocking {
  readonly residual: Residual;
  readonly level: Int32Array;
  readonly cursor: Uint32Array;
}

/** Next admissible edge out of `vertex`, advancing the cursor past dead ends; -1 if none. */
function admissibleEdge({ residual, level, cursor }: Blocking, vertex: number): number {
  const edges = residual.adjacency[vertex]!;
  let position = cursor[vertex]!;

  while (position < edges.length) {
    const edge = edges[position]!;

    if (residual.capacity[edge]! > 0 && level[residual.to[edge]!] === level[vertex]! + 1) {
      cursor[vertex] = position;

      return edge;
    }

    position++;
  }

  cursor[vertex] = position;

  return -1;
}

function saturate(residual: Residual, path: readonly number[]): number {
  const amount = Math.min(...path.map((edge) => residual.capacity[edge]!));

  for (const edge of path) {
    residual.capacity[edge]! -= amount;
    residual.capacity[edge ^ 1]! += amount;
  }

  return amount;
}

/** Walks from the source; returns the amount pushed along one path, or -1 when stuck at source. */
function findAndPush(blocking: Blocking, terminals: Terminals, path: number[]): number {
  const { residual, level } = blocking;

  for (let vertex = terminals.source; ;) {
    if (vertex === terminals.sink) {
      return saturate(residual, path.splice(0));
    }

    const edge = admissibleEdge(blocking, vertex);

    if (edge !== -1) {
      path.push(edge);
      vertex = residual.to[edge]!;
      continue;
    }

    if (vertex === terminals.source) {
      return -1;
    }

    level[vertex] = -1;
    vertex = residual.to[path.pop()! ^ 1]!;
  }
}

function blockingFlow(blocking: Blocking, terminals: Terminals): number {
  const path: number[] = [];
  let total = 0;

  for (let pushed = findAndPush(blocking, terminals, path); pushed !== -1;) {
    total += pushed;
    pushed = findAndPush(blocking, terminals, path);
  }

  return total;
}

/** Dinic's algorithm, O(V²·E). Arc weights are capacities. */
export function dinicKernel(csr: Csr, vertexCount: number, terminals: Terminals): number {
  const residual = buildResidual(csr, vertexCount);
  let total = 0;

  for (let level = levelGraph(residual, terminals); level[terminals.sink] !== -1;) {
    const cursor = new Uint32Array(vertexCount);

    total += blockingFlow({ residual, level, cursor }, terminals);
    level = levelGraph(residual, terminals);
  }

  return total;
}
