import {
  dagShortestPaths,
  johnson,
  maximumMatching,
  minCut,
  minimumSpanningArborescence,
  type Graph,
} from 'graph-toolkit';
import { edgeKey, NONE, type Highlight, type Selection } from './analysis-types.js';

export type OptimizationKind = 'min-cut' | 'blossom' | 'johnson' | 'dag-distances' | 'arborescence';

const MAX_ROWS = 500;
const MAX_DISPLAY = 40;
const FIRST_COLOR = 1;
const SECOND_COLOR = 2;

const show = (distance: number): string => (Number.isFinite(distance) ? String(distance) : '∞');
const pick = (message: string): Highlight => ({ ...NONE, summary: message });

function minimumCut(graph: Graph, { from, to }: Selection): Highlight {
  if (from === undefined || to === undefined) return pick('Pick source and sink.');
  const cut = minCut(graph, from, to);
  return {
    ...NONE,
    colors: new Map([
      ...cut.sourceSide.map((id) => [id, FIRST_COLOR] as const),
      ...cut.sinkSide.map((id) => [id, SECOND_COLOR] as const),
    ]),
    edges: new Set(cut.edges.map((edge) => edgeKey(edge.source, edge.target, graph.directed))),
    summary: `Minimum cut ${from} | ${to} has capacity ${cut.value}`,
    table: cut.edges.map((edge) => [`${edge.source} → ${edge.target}`, String(edge.weight)]),
  };
}

function generalMatching(graph: Graph): Highlight {
  const { pairs, size } = maximumMatching(graph);
  return {
    ...NONE,
    edges: new Set(pairs.map(([a, b]) => edgeKey(a, b, graph.directed))),
    colors: new Map(
      pairs.flatMap(([a, b]) => [[a, FIRST_COLOR] as const, [b, FIRST_COLOR] as const]),
    ),
    summary: `Maximum matching of size ${size} (blossom)`,
    table: pairs.map(([a, b]) => [a, b]),
  };
}

function allPairsJohnson(graph: Graph): Highlight {
  if (graph.vertexCount > MAX_DISPLAY) {
    return pick(
      `${graph.vertexCount} × ${graph.vertexCount} is too large to display (limit ${MAX_DISPLAY})`,
    );
  }
  const distances = johnson(graph);
  const ids = graph.vertices();
  return {
    ...NONE,
    summary: 'All-pairs distances (Johnson)',
    matrix: { labels: ids, rows: ids.map((a) => ids.map((b) => distances.distance(a, b))) },
  };
}

function dagDistances(graph: Graph, { from }: Selection): Highlight {
  if (from === undefined) return pick('Pick a start vertex.');
  const tree = dagShortestPaths(graph, from);
  const rows = graph
    .vertices()
    .slice(0, MAX_ROWS)
    .map((id): readonly [string, string] => [id, show(tree.distanceTo(id))]);
  return { ...NONE, summary: `Distances from ${from} on the DAG`, table: rows };
}

function arborescence(graph: Graph, { from }: Selection): Highlight {
  if (from === undefined) return pick('Pick a root vertex.');
  const tree = minimumSpanningArborescence(graph, from);
  if (tree === undefined) return pick(`Some vertices are unreachable from ${from}.`);
  return {
    ...NONE,
    colors: new Map([[from, FIRST_COLOR]]),
    edges: new Set(tree.edges.map((edge) => edgeKey(edge.source, edge.target, graph.directed))),
    summary: `Minimum arborescence of weight ${tree.totalWeight}`,
    table: tree.edges.map((edge) => [`${edge.source} → ${edge.target}`, String(edge.weight)]),
  };
}

export const optimizationAnalyses: Readonly<
  Record<OptimizationKind, (graph: Graph, selection: Selection) => Highlight>
> = {
  'min-cut': minimumCut,
  blossom: (graph) => generalMatching(graph),
  johnson: (graph) => allPairsJohnson(graph),
  'dag-distances': dagDistances,
  arborescence,
};
