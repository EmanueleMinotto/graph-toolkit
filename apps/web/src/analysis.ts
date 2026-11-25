import { bfs, dijkstra, dsaturColoring, minimumSpanningForest, type Graph } from 'graph-toolkit';
import { edgeKey, NONE, pathEdges, type Highlight, type Selection } from './analysis-types.js';
import { pathAnalyses, type PathKind } from './analysis-paths.js';
import { structureAnalyses, type StructureKind } from './analysis-structure.js';

export type AnalysisKind =
  'none' | 'bfs' | 'shortest-path' | 'coloring' | 'mst' | StructureKind | PathKind;

export { edgeKey, type Highlight, type Selection } from './analysis-types.js';

function shortestPath(graph: Graph, { from, to }: Selection): Highlight {
  if (from === undefined || to === undefined) return { ...NONE, summary: 'Pick two vertices.' };
  const tree = dijkstra(graph, from);
  const path = tree.pathTo(to);
  if (path === undefined) return { ...NONE, summary: 'Unreachable.' };
  return {
    colors: new Map(path.map((id) => [id, 1])),
    edges: pathEdges(path, graph.directed),
    summary: `Distance ${tree.distanceTo(to)} via ${path.join(' → ')}`,
  };
}

function breadthFirst(graph: Graph, { from }: Selection): Highlight {
  if (from === undefined) return { ...NONE, summary: 'Pick a start vertex.' };
  const order = bfs(graph, from);
  return {
    ...NONE,
    colors: new Map(order.map((id) => [id, 1])),
    summary: `${order.length} vertices reached`,
    table: order.map((id, index) => [String(index + 1), id]),
  };
}

function coloring(graph: Graph): Highlight {
  const result = dsaturColoring(graph);
  return {
    ...NONE,
    colors: new Map(result.colors),
    summary: `${result.colorCount} colors (DSATUR)`,
    table: [...result.colors].map(([id, color]) => [id, String(color)]),
  };
}

function spanningTree(graph: Graph): Highlight {
  const forest = minimumSpanningForest(graph);
  return {
    ...NONE,
    edges: new Set(forest.edges.map((edge) => edgeKey(edge.source, edge.target, graph.directed))),
    summary: `Total weight ${forest.totalWeight}`,
  };
}

const analyses: Readonly<Record<AnalysisKind, (graph: Graph, selection: Selection) => Highlight>> =
  {
    none: () => NONE,
    bfs: breadthFirst,
    'shortest-path': shortestPath,
    coloring: (graph) => coloring(graph),
    mst: (graph) => spanningTree(graph),
    ...structureAnalyses,
    ...pathAnalyses,
  };

/** Runs an analysis; library errors become the summary text. */
export function analyze(kind: AnalysisKind, graph: Graph, selection: Selection): Highlight {
  try {
    return analyses[kind](graph, selection);
  } catch (error) {
    return { ...NONE, summary: error instanceof Error ? error.message : 'Analysis failed.' };
  }
}
