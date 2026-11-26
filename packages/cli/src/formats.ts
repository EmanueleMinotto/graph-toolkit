import type { Graph } from '@graph-sdk/core';
import {
  fromAdjacencyCsv,
  fromDimacs,
  fromDot,
  fromEdgeList,
  fromGexf,
  fromGml,
  fromGraph6,
  fromGraphMl,
  fromJson,
  fromMermaid,
  fromPajek,
  fromSparse6,
  toAdjacencyCsv,
  toDimacs,
  toDot,
  toEdgeList,
  toGexf,
  toGml,
  toGraph6,
  toGraphMl,
  toJson,
  toMermaid,
  toPajek,
  toSparse6,
} from '@graph-sdk/io';

interface Format {
  readonly read: (text: string) => Graph;
  readonly write: (graph: Graph) => string;
}

/** Text formats the CLI converts between, by name. */
export const FORMATS: Readonly<Record<string, Format>> = {
  json: { read: fromJson, write: toJson },
  edgelist: { read: (text) => fromEdgeList(text), write: toEdgeList },
  csv: { read: (text) => fromAdjacencyCsv(text), write: toAdjacencyCsv },
  dot: { read: fromDot, write: toDot },
  graphml: { read: fromGraphMl, write: toGraphMl },
  gexf: { read: fromGexf, write: toGexf },
  gml: { read: fromGml, write: toGml },
  graph6: { read: fromGraph6, write: toGraph6 },
  sparse6: { read: fromSparse6, write: toSparse6 },
  pajek: { read: fromPajek, write: toPajek },
  dimacs: { read: fromDimacs, write: toDimacs },
  mermaid: { read: fromMermaid, write: toMermaid },
};
