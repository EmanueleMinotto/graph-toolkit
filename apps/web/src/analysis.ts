import { bfs, dijkstra, type Graph } from 'graph-toolkit';
import { NONE, pathEdges, type Highlight, type Selection } from './analysis-types.js';
import { coloringAnalyses, type ColoringKind } from './analysis-coloring.js';
import { networkAnalyses, type NetworkKind } from './analysis-network.js';
import { pathAnalyses, type PathKind } from './analysis-paths.js';
import { treeAnalyses, type TreeKind } from './analysis-trees.js';
import { structureAnalyses, type StructureKind } from './analysis-structure.js';

export type AnalysisKind =
  | 'none'
  | 'bfs'
  | 'shortest-path'
  | StructureKind
  | PathKind
  | TreeKind
  | ColoringKind
  | NetworkKind;

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

const analyses: Readonly<Record<AnalysisKind, (graph: Graph, selection: Selection) => Highlight>> =
  {
    none: () => NONE,
    bfs: breadthFirst,
    'shortest-path': shortestPath,
    ...structureAnalyses,
    ...treeAnalyses,
    ...coloringAnalyses,
    ...pathAnalyses,
    ...networkAnalyses,
  };

/** Runs an analysis; library errors become the summary text. */
export function analyze(kind: AnalysisKind, graph: Graph, selection: Selection): Highlight {
  try {
    return analyses[kind](graph, selection);
  } catch (error) {
    return { ...NONE, summary: error instanceof Error ? error.message : 'Analysis failed.' };
  }
}
