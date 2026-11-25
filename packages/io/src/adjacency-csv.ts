import type { Graph } from '@graph-toolkit/core';
import { adjacencyMatrix, graphFromAdjacency, Matrix } from '@graph-toolkit/matrix';
import { ParseError } from './errors.js';

/** Weighted adjacency matrix as comma-separated rows (vertex ids are not preserved). */
export function toAdjacencyCsv(graph: Graph): string {
  return adjacencyMatrix(graph, { isWeighted: true })
    .toRows()
    .map((row) => row.join(','))
    .join('\n');
}

export interface AdjacencyCsvOptions {
  readonly isDirected?: boolean;
}

/** Parses a square numeric matrix into a graph with vertices `"0"`..`"n-1"`. */
export function fromAdjacencyCsv(text: string, options: AdjacencyCsvOptions = {}): Graph {
  const rows = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .map((line) => line.split(',').map(Number));
  if (rows.some((row) => row.some((cell) => !Number.isFinite(cell)))) {
    throw new ParseError('Adjacency CSV contains a non-numeric cell');
  }
  return graphFromAdjacency(Matrix.fromRows(rows), options);
}
