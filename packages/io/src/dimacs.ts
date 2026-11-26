import type { Graph } from '@graph-sdk/core';
import { ParseError } from './errors.js';
import { assembleGraph, type ParsedEdge } from './internal/assemble.js';

const ROW_FIELDS = 4;
const HEADER_FIELDS = 4;

/**
 * DIMACS: `p edge n m` with `e u v [w]` lines (undirected) or `p sp n m` with `a u v w` lines
 * (directed). Vertices are numbered from 1 in insertion order, so names are not kept.
 */
export function toDimacs(graph: Graph): string {
  const [kind, letter] = graph.directed ? (['sp', 'a'] as const) : (['edge', 'e'] as const);
  const rows = graph
    .edges()
    .map(
      (edge) =>
        `${letter} ${graph.indexOf(edge.source) + 1} ${graph.indexOf(edge.target) + 1} ${edge.weight}`,
    );
  return [`p ${kind} ${graph.vertexCount} ${graph.edgeCount}`, ...rows, ''].join('\n');
}

function parseRow(line: string, count: number): ParsedEdge {
  const [, from, to, weight] = line.split(/\s+/u, ROW_FIELDS);
  const [source, target] = [Number(from), Number(to)];
  const parsed = weight === undefined ? 1 : Number(weight);
  const isVertex = (value: number): boolean =>
    Number.isSafeInteger(value) && value >= 1 && value <= count;
  if (!isVertex(source) || !isVertex(target) || !Number.isFinite(parsed)) {
    throw new ParseError(`Invalid DIMACS line: ${line}`);
  }
  return { source: String(source), target: String(target), weight: parsed };
}

/** Reads a DIMACS graph (`c` comment lines are skipped). */
export function fromDimacs(text: string): Graph {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('c'));
  const header = lines.find((line) => line.startsWith('p '))?.split(/\s+/u, HEADER_FIELDS);
  const count = Number(header?.[2]);
  if (header === undefined || !Number.isSafeInteger(count) || count < 0) {
    throw new ParseError('DIMACS document needs a "p <kind> <vertices> <edges>" line');
  }
  const rows = lines.filter((line) => /^[ea]\s/u.test(line)).map((line) => parseRow(line, count));
  const vertices = Array.from({ length: count }, (_, index) => String(index + 1));
  return assembleGraph({ directed: header[1] === 'sp', vertices, edges: rows });
}
