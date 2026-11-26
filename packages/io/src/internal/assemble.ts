import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';

export interface ParsedEdge {
  readonly source: string;
  readonly target: string;
  readonly weight: number;
}

export interface ParsedGraph {
  readonly directed: boolean;
  /** Declared vertices; endpoints of edges are added implicitly, in first-seen order. */
  readonly vertices: readonly string[];
  readonly edges: readonly ParsedEdge[];
}

export function assembleGraph(parsed: ParsedGraph): Graph {
  const builder = new GraphBuilder({ directed: parsed.directed });
  const seen = new Set<string>();
  const declare = (name: string): void => {
    if (seen.has(name)) {
      return;
    }

    seen.add(name);
    builder.addVertex(vertexId(name));
  };

  for (const name of parsed.vertices) {
    declare(name);
  }

  for (const edge of parsed.edges) {
    declare(edge.source);
    declare(edge.target);
    builder.addEdge(vertexId(edge.source), vertexId(edge.target), edge.weight);
  }

  return builder.build();
}
