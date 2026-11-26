import { GraphBuilder, vertexId, type Attributes, type Graph } from '@graph-sdk/core';

export interface ParsedEdge {
  readonly source: string;
  readonly target: string;
  readonly weight: number;
  readonly attributes?: Attributes;
}

export interface ParsedGraph {
  readonly directed: boolean;
  /** Declared vertices; endpoints of edges are added implicitly, in first-seen order. */
  readonly vertices: readonly string[];
  readonly edges: readonly ParsedEdge[];
  /** Attributes by vertex name; names not declared as vertices are ignored. */
  readonly vertexAttributes?: Readonly<Record<string, Attributes>>;
}

export function assembleGraph(parsed: ParsedGraph): Graph {
  const builder = new GraphBuilder({ directed: parsed.directed });
  const seen = new Set<string>();
  const declare = (name: string): void => {
    if (seen.has(name)) {
      return;
    }

    seen.add(name);
    builder.addVertex(vertexId(name), parsed.vertexAttributes?.[name]);
  };

  for (const name of parsed.vertices) {
    declare(name);
  }

  for (const edge of parsed.edges) {
    declare(edge.source);
    declare(edge.target);

    builder.addEdge(vertexId(edge.source), vertexId(edge.target), {
      weight: edge.weight,
      ...(edge.attributes && { attributes: edge.attributes }),
    });
  }

  return builder.build();
}
