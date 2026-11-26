import type { Csr } from '@graph-sdk/core';

interface Problem {
  readonly csr: Csr;
  readonly order: readonly number[];
  readonly colors: Int32Array;
  readonly limit: number;
}

function isFree(problem: Problem, vertex: number, color: number): boolean {
  const { csr, colors } = problem;

  for (let slot = csr.offsets[vertex]!; slot < csr.offsets[vertex + 1]!; slot++) {
    if (colors[csr.targets[slot]!] === color) {
      return false;
    }
  }

  return true;
}

/** Colors `order[position..]`; a new color is only opened one past the highest in use. */
function assign(problem: Problem, position: number, used: number): boolean {
  if (position === problem.order.length) {
    return true;
  }

  const vertex = problem.order[position]!;

  for (let color = 0; color < Math.min(used + 1, problem.limit); color++) {
    if (!isFree(problem, vertex, color)) {
      continue;
    }

    problem.colors[vertex] = color;

    if (assign(problem, position + 1, Math.max(used, color + 1))) {
      return true;
    }

    problem.colors[vertex] = -1;
  }

  return false;
}

function byDegreeDescending(csr: Csr, vertexCount: number): number[] {
  const degree = (vertex: number): number => csr.offsets[vertex + 1]! - csr.offsets[vertex]!;

  return Array.from({ length: vertexCount }, (_, vertex) => vertex).toSorted(
    (left, right) => degree(right) - degree(left),
  );
}

/** Backtracking k-colorability test; exponential in the worst case. */
export function colorWith(csr: Csr, vertexCount: number, limit: number): Int32Array | undefined {
  const colors = new Int32Array(vertexCount).fill(-1);
  const problem: Problem = { csr, order: byDegreeDescending(csr, vertexCount), colors, limit };

  return assign(problem, 0, 0) ? colors : undefined;
}

/** Smallest k for which a proper k-coloring exists, searching upward from 1. */
export function exactKernel(csr: Csr, vertexCount: number): Int32Array {
  for (let limit = 1; ; limit++) {
    const colors = colorWith(csr, vertexCount, limit);

    if (colors !== undefined) {
      return colors;
    }
  }
}

/** Greedy edge coloring: edge `i` gets the smallest color unused at both endpoints. */
export function edgeColorKernel(
  vertexCount: number,
  edges: readonly (readonly [number, number])[],
): number[] {
  const used: Set<number>[] = Array.from({ length: vertexCount }, () => new Set());

  return edges.map(([left, right]) => {
    let color = 0;

    while (used[left]!.has(color) || used[right]!.has(color)) {
      color++;
    }

    used[left]!.add(color);
    used[right]!.add(color);

    return color;
  });
}

export function colorAt(colors: readonly number[], index: number): number {
  return colors[index]!;
}
