import type { Graph } from '@graph-sdk/core';
import { assembleGraph, type ParsedEdge } from './internal/assemble.js';
import { parseEdgeLine } from './internal/edge-line.js';

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

/** Parses `source target [weight]` lines separated by commas or whitespace; `#` starts a comment. */
export function fromEdgeList(text: string, options: EdgeListOptions = {}): Graph {
  const edges = text.split('\n').flatMap((line): readonly ParsedEdge[] => {
    const edge = parseEdgeLine(line);

    return edge === undefined ? [] : [edge];
  });

  return assembleGraph({ directed: options.isDirected ?? false, vertices: [], edges });
}
