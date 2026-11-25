import {
  adjacencySpectrum,
  algebraicConnectivity,
  articulationPoints,
  averageClustering,
  biconnectedComponents,
  bridges,
  center,
  clusteringCoefficients,
  diameter,
  kCores,
  radius,
  transitiveClosure,
  type Graph,
  type VertexId,
} from 'graph-toolkit';
import { edgeKey, NONE, type Highlight, type Selection } from './analysis-types.js';

export type AdvancedKind =
  | 'bridges'
  | 'articulation'
  | 'blocks'
  | 'k-cores'
  | 'clustering'
  | 'diameter'
  | 'transitive-closure'
  | 'spectrum';

const MAX_ROWS = 500;
const FIRST_COLOR = 1;

const rounded = (value: number): string => String(Number(value.toPrecision(4)));
const show = (distance: number): string => (Number.isFinite(distance) ? String(distance) : '∞');
const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

function bridgeEdges(graph: Graph): Highlight {
  const found = bridges(graph);
  return {
    ...NONE,
    edges: new Set(found.map(([a, b]) => edgeKey(a, b, graph.directed))),
    summary: plural(found.length, 'bridge'),
    table: found.map(([a, b]) => [a, b]),
  };
}

function cutVertices(graph: Graph): Highlight {
  const found = articulationPoints(graph);
  return {
    ...NONE,
    colors: new Map(found.map((id) => [id, FIRST_COLOR])),
    summary: plural(found.length, 'articulation point'),
    table: found.map((id, index) => [String(index + 1), id]),
  };
}

function blocks(graph: Graph): Highlight {
  const found = biconnectedComponents(graph);
  return {
    ...NONE,
    colors: new Map(found.flatMap((members, index) => members.map((id) => [id, index] as const))),
    summary: plural(found.length, 'biconnected component'),
    table: found.map((members, index) => [String(index + 1), members.join(', ')]),
  };
}

/** Sizes vertices by score relative to the best and lists scores, highest first. */
function ranked(
  summary: (best: string) => string,
  scores: ReadonlyMap<VertexId, number>,
): Highlight {
  const entries = [...scores].toSorted(([, left], [, right]) => right - left);
  const top = entries[0]?.[1] ?? 0;
  return {
    ...NONE,
    sizes: new Map(entries.map(([id, score]) => [id, top > 0 ? score / top : 0])),
    summary: summary(entries[0]?.[0] ?? '–'),
    table: entries.slice(0, MAX_ROWS).map(([id, score]) => [id, rounded(score)]),
  };
}

function distanceMeasures(graph: Graph): Highlight {
  const middle = center(graph);
  return {
    ...NONE,
    colors: new Map(middle.map((id) => [id, FIRST_COLOR])),
    summary: `Diameter ${show(diameter(graph))}, radius ${show(radius(graph))}`,
    table: middle.map((id) => ['center', id]),
  };
}

function spectrum(graph: Graph): Highlight {
  const values = adjacencySpectrum(graph);
  return {
    ...NONE,
    summary: `Algebraic connectivity ${rounded(algebraicConnectivity(graph))}`,
    table: values.slice(0, MAX_ROWS).map((value, index) => [`λ${index + 1}`, rounded(value)]),
  };
}

export const advancedAnalyses: Readonly<
  Record<AdvancedKind, (graph: Graph, selection: Selection) => Highlight>
> = {
  bridges: (graph) => bridgeEdges(graph),
  articulation: (graph) => cutVertices(graph),
  blocks: (graph) => blocks(graph),
  'k-cores': (graph) => ranked((best) => `Highest core: ${best}`, kCores(graph)),
  clustering: (graph) =>
    ranked(
      () => `Average clustering ${rounded(averageClustering(graph))}`,
      clusteringCoefficients(graph),
    ),
  diameter: (graph) => distanceMeasures(graph),
  'transitive-closure': (graph) => ({
    ...NONE,
    summary: `The transitive closure has ${plural(transitiveClosure(graph).edgeCount, 'arc')}`,
  }),
  spectrum: (graph) => spectrum(graph),
};
