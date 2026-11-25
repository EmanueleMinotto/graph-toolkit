import {
  completeGraph,
  cycleGraph,
  fromAdjacencyCsv,
  fromDot,
  fromEdgeList,
  fromGexf,
  fromGraphMl,
  fromJson,
  fromMermaid,
  gridGraph,
  pathGraph,
  randomGraph,
  starGraph,
  toAdjacencyCsv,
  toDot,
  toEdgeList,
  toGexf,
  toGraphMl,
  toJson,
  toMermaid,
  type Graph,
} from 'graph-toolkit';

export type Format =
  'json' | 'edge-list' | 'dot' | 'graphml' | 'gexf' | 'adjacency-csv' | 'mermaid';

export const FORMATS: readonly Format[] = [
  'json',
  'edge-list',
  'dot',
  'graphml',
  'gexf',
  'adjacency-csv',
  'mermaid',
];

const importers: Readonly<Record<Format, (text: string, isDirected: boolean) => Graph>> = {
  json: (text) => fromJson(text),
  'edge-list': (text, isDirected) => fromEdgeList(text, { isDirected }),
  dot: (text) => fromDot(text),
  graphml: (text) => fromGraphMl(text),
  gexf: (text) => fromGexf(text),
  'adjacency-csv': (text, isDirected) => fromAdjacencyCsv(text, { isDirected }),
  mermaid: (text) => fromMermaid(text),
};

const exporters: Readonly<Record<Format, (graph: Graph) => string>> = {
  json: (graph) => toJson(graph),
  'edge-list': (graph) => toEdgeList(graph),
  dot: (graph) => toDot(graph),
  graphml: (graph) => toGraphMl(graph),
  gexf: (graph) => toGexf(graph),
  'adjacency-csv': (graph) => toAdjacencyCsv(graph),
  mermaid: (graph) => toMermaid(graph),
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
  'adjacency-csv': 'csv',
  mermaid: 'mmd',
};

export const fileName = (format: Format): string => `graph.${EXTENSIONS[format]}`;

/** Guesses the format from a file name; `.txt` is the edge list, `.csv` the adjacency matrix. */
export const formatFromFileName = (name: string): Format | undefined =>
  FORMATS.find((format) => name.toLowerCase().endsWith(`.${EXTENSIONS[format]}`));

export type SampleKind = 'path' | 'cycle' | 'complete' | 'grid' | 'star' | 'random';

export const SAMPLES: readonly SampleKind[] = [
  'path',
  'cycle',
  'complete',
  'grid',
  'star',
  'random',
];

export interface GenerateOptions {
  readonly directed: boolean;
  readonly seed: number;
  /** Edge probability for `random`; `undefined` picks a density that keeps large graphs sparse. */
  readonly probability: number | undefined;
}

export const DEFAULT_OPTIONS: GenerateOptions = {
  directed: false,
  seed: 7,
  probability: undefined,
};

const EDGE_PROBABILITY = 0.25;
const AVERAGE_DEGREE = 6;

/** Largest accepted size per kind; dense kinds are capped lower to keep the SVG responsive. */
export const MAX_SIZE: Readonly<Record<SampleKind, number>> = {
  path: 2000,
  cycle: 2000,
  star: 2000,
  random: 1000,
  grid: 40, // side length: 40 × 40 = 1600 vertices
  complete: 150, // 150 vertices = 11 175 edges
};

/** Dense for small graphs, sparse (about `AVERAGE_DEGREE` neighbours) for large ones. */
const randomProbability = (size: number): number =>
  Math.min(EDGE_PROBABILITY, AVERAGE_DEGREE / Math.max(size - 1, 1));

type Builder = (size: number, options: GenerateOptions) => Graph;

const samples: Readonly<Record<SampleKind, Builder>> = {
  path: (size, { directed }) => pathGraph(size, { directed }),
  cycle: (size, { directed }) => cycleGraph(size, { directed }),
  complete: (size, { directed }) => completeGraph(size, { directed }),
  grid: (size, { directed }) => gridGraph(size, size, { directed }),
  star: (size, { directed }) => starGraph(size, { directed }),
  random: (size, { directed, seed, probability }) =>
    randomGraph(size, { directed, seed, probability: probability ?? randomProbability(size) }),
};

const clampSize = (kind: SampleKind, size: number): number =>
  Math.min(Math.max(size, 1), MAX_SIZE[kind]);

export const makeSample = (
  kind: SampleKind,
  size: number,
  options: GenerateOptions = DEFAULT_OPTIONS,
): Graph => samples[kind](clampSize(kind, Math.trunc(size)), options);
