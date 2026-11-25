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
  pruferCode,
  treeFromPruferCode,
  vertexId,
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
  type Graph,
} from 'graph-toolkit';

export type Format =
  | 'json'
  | 'edge-list'
  | 'dot'
  | 'graphml'
  | 'gexf'
  | 'gml'
  | 'graph6'
  | 'sparse6'
  | 'pajek'
  | 'dimacs'
  | 'adjacency-csv'
  | 'mermaid'
  | 'prufer';

export const FORMATS: readonly Format[] = [
  'json',
  'edge-list',
  'dot',
  'graphml',
  'gexf',
  'gml',
  'graph6',
  'sparse6',
  'pajek',
  'dimacs',
  'adjacency-csv',
  'mermaid',
  'prufer',
];

/** Space-separated Prüfer code: the tree has vertices "0".."n+1" for a code of length n. */
const fromPrufer = (text: string): Graph => {
  const code =
    text.trim() === ''
      ? []
      : text
          .trim()
          .split(/\s+/u)
          .map((id) => vertexId(id));
  const vertices = Array.from({ length: code.length + 2 }, (_, index) => vertexId(String(index)));
  return treeFromPruferCode(vertices, code);
};

const importers: Readonly<Record<Format, (text: string, isDirected: boolean) => Graph>> = {
  json: (text) => fromJson(text),
  'edge-list': (text, isDirected) => fromEdgeList(text, { isDirected }),
  dot: (text) => fromDot(text),
  graphml: (text) => fromGraphMl(text),
  gexf: (text) => fromGexf(text),
  gml: (text) => fromGml(text),
  graph6: (text) => fromGraph6(text),
  sparse6: (text) => fromSparse6(text),
  pajek: (text) => fromPajek(text),
  dimacs: (text) => fromDimacs(text),
  'adjacency-csv': (text, isDirected) => fromAdjacencyCsv(text, { isDirected }),
  mermaid: (text) => fromMermaid(text),
  prufer: (text) => fromPrufer(text),
};

const exporters: Readonly<Record<Format, (graph: Graph) => string>> = {
  json: (graph) => toJson(graph),
  'edge-list': (graph) => toEdgeList(graph),
  dot: (graph) => toDot(graph),
  graphml: (graph) => toGraphMl(graph),
  gexf: (graph) => toGexf(graph),
  gml: (graph) => toGml(graph),
  graph6: (graph) => toGraph6(graph),
  sparse6: (graph) => toSparse6(graph),
  pajek: (graph) => toPajek(graph),
  dimacs: (graph) => toDimacs(graph),
  'adjacency-csv': (graph) => toAdjacencyCsv(graph),
  mermaid: (graph) => toMermaid(graph),
  prufer: (graph) => pruferCode(graph).join(' '),
};

export const parseGraph = (format: Format, text: string, isDirected: boolean): Graph =>
  importers[format](text, isDirected);

export const serializeGraph = (format: Format, graph: Graph): string => exporters[format](graph);

const EXTENSIONS: Readonly<Record<Format, string>> = {
  json: 'json',
  'edge-list': 'txt',
  dot: 'dot',
  graphml: 'graphml',
  gexf: 'gexf',
  gml: 'gml',
  graph6: 'g6',
  sparse6: 's6',
  pajek: 'net',
  dimacs: 'dimacs',
  'adjacency-csv': 'csv',
  mermaid: 'mmd',
  prufer: 'prufer',
};

export const fileName = (format: Format): string => `graph.${EXTENSIONS[format]}`;

/** Guesses the format from a file name; `.txt` is the edge list, `.csv` the adjacency matrix. */
export const formatFromFileName = (name: string): Format | undefined =>
  FORMATS.find((format) => name.toLowerCase().endsWith(`.${EXTENSIONS[format]}`));
