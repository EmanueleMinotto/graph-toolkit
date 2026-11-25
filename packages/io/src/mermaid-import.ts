import type { Graph } from '@graph-sdk/core';
import { assembleGraph } from './internal/assemble.js';
import { parseMermaid } from './internal/mermaid-parse.js';

/**
 * Parses simple Mermaid flowcharts: `a --> b`, `a --- b`, `a -->|3| b`, node labels such as
 * `n0["name"]`. Vertex ids are labels when given, else keys. The graph is directed when any
 * `-->` appears. Subgraphs, styling and chained edges are not supported.
 */
export function fromMermaid(text: string): Graph {
  return assembleGraph(parseMermaid(text));
}
