import type { Graph } from '@graph-sdk/core';
import { ParseError } from './errors.js';
import { assembleGraph, type ParsedEdge } from './internal/assemble.js';

export interface EdgeListOptions {
  readonly isDirected?: boolean;
}

/** One `source,target,weight` line per edge. Isolated vertices are not representable. */
export function toEdgeList(graph: Graph): string {
  return graph
    .edges()
    .map((edge) => `${edge.source},${edge.target},${edge.weight}`)
    .join('\n');
}

function parseLine(line: string): ParsedEdge {
  const [source, target, weight, ...extra] = line.split(/[\s,]+/);
  const parsedWeight = weight === undefined ? 1 : Number(weight);
  if (
    source === undefined ||
    target === undefined ||
    extra.length > 0 ||
    !Number.isFinite(parsedWeight)
  ) {
    throw new ParseError(`Invalid edge line: ${line}`);
  }
  return { source, target, weight: parsedWeight };
}

/** Parses `source target [weight]` lines separated by commas or whitespace; `#` starts a comment. */
export function fromEdgeList(text: string, options: EdgeListOptions = {}): Graph {
  const edges = text
    .split('\n')
    .map((line) => line.replace(/#.*/, '').trim())
    .filter((line) => line !== '')
    .map((line) => parseLine(line));
  return assembleGraph({ directed: options.isDirected ?? false, vertices: [], edges });
}
