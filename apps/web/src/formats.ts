import {
  completeGraph,
  cycleGraph,
  fromAdjacencyCsv,
  fromDot,
  fromEdgeList,
  fromGexf,
  fromGraphMl,
  fromJson,
  gridGraph,
  randomGraph,
  starGraph,
  toAdjacencyCsv,
  toDot,
  toEdgeList,
  toGexf,
  toGraphMl,
  toJson,
  type Graph,
} from 'graph-toolkit';

export type Format = 'json' | 'edge-list' | 'dot' | 'graphml' | 'gexf' | 'adjacency-csv';

export const FORMATS: readonly Format[] = [
  'json',
  'edge-list',
  'dot',
  'graphml',
  'gexf',
  'adjacency-csv',
];

const importers: Readonly<Record<Format, (text: string, isDirected: boolean) => Graph>> = {
  json: (text) => fromJson(text),
  'edge-list': (text, isDirected) => fromEdgeList(text, { isDirected }),
  dot: (text) => fromDot(text),
  graphml: (text) => fromGraphMl(text),
  gexf: (text) => fromGexf(text),
  'adjacency-csv': (text, isDirected) => fromAdjacencyCsv(text, { isDirected }),
};

const exporters: Readonly<Record<Format, (graph: Graph) => string>> = {
  json: (graph) => toJson(graph),
  'edge-list': (graph) => toEdgeList(graph),
  dot: (graph) => toDot(graph),
  graphml: (graph) => toGraphMl(graph),
  gexf: (graph) => toGexf(graph),
  'adjacency-csv': (graph) => toAdjacencyCsv(graph),
};

export const parseGraph = (format: Format, text: string, isDirected: boolean): Graph =>
  importers[format](text, isDirected);

export const serializeGraph = (format: Format, graph: Graph): string => exporters[format](graph);

export type SampleKind = 'cycle' | 'complete' | 'grid' | 'star' | 'random';

export const SAMPLES: readonly SampleKind[] = ['cycle', 'complete', 'grid', 'star', 'random'];

const SEED = 7;
const EDGE_PROBABILITY = 0.25;
const AVERAGE_DEGREE = 6;

/** Largest accepted size per kind; dense kinds are capped lower to keep the SVG responsive. */
export const MAX_SIZE: Readonly<Record<SampleKind, number>> = {
  cycle: 2000,
  star: 2000,
  random: 1000,
  grid: 40, // side length: 40 × 40 = 1600 vertices
  complete: 150, // 150 vertices = 11 175 edges
};

/** Dense for small graphs, sparse (about `AVERAGE_DEGREE` neighbours) for large ones. */
const randomProbability = (size: number): number =>
  Math.min(EDGE_PROBABILITY, AVERAGE_DEGREE / Math.max(size - 1, 1));

const samples: Readonly<Record<SampleKind, (size: number) => Graph>> = {
  cycle: (size) => cycleGraph(size),
  complete: (size) => completeGraph(size),
  grid: (size) => gridGraph(size, size),
  star: (size) => starGraph(size),
  random: (size) => randomGraph(size, { probability: randomProbability(size), seed: SEED }),
};

const clampSize = (kind: SampleKind, size: number): number =>
  Math.min(Math.max(size, 1), MAX_SIZE[kind]);

export const makeSample = (kind: SampleKind, size: number): Graph =>
  samples[kind](clampSize(kind, Math.trunc(size)));
