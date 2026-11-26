import {
  dsaturColoring,
  edgeColoring,
  exactColoring,
  greedyColoring,
  isProperColoring,
  type Coloring,
  type Graph,
} from 'graph-toolkit';
import { edgeKey, NONE, type Highlight } from './analysis-types.js';

export type ColoringKind = 'coloring' | 'greedy-coloring' | 'exact-coloring' | 'edge-coloring';

function vertexColoring(name: string, solve: (graph: Graph) => Coloring) {
  return (graph: Graph): Highlight => {
    const result = solve(graph);
    const check = isProperColoring(graph, result) ? 'proper' : 'NOT proper';

    return {
      ...NONE,
      colors: new Map(result.colors),
      summary: `${result.colorCount} colors (${name}, ${check})`,
      table: [...result.colors].map(([id, color]) => [id, String(color)]),
    };
  };
}

function edgeColors(graph: Graph): Highlight {
  const result = edgeColoring(graph);

  return {
    ...NONE,
    edgeColors: new Map(
      result.edges.map((edge) => [edgeKey(edge.source, edge.target, graph.directed), edge.color]),
    ),
    summary: `${result.colorCount} edge colors (greedy)`,
    table: result.edges.map((edge) => [`${edge.source} — ${edge.target}`, String(edge.color)]),
  };
}

export const coloringAnalyses: Readonly<Record<ColoringKind, (graph: Graph) => Highlight>> = {
  coloring: vertexColoring('DSATUR', (graph) => dsaturColoring(graph)),
  'greedy-coloring': vertexColoring('Welsh–Powell', (graph) => greedyColoring(graph)),
  'exact-coloring': vertexColoring('exact', (graph) => exactColoring(graph)),
  'edge-coloring': edgeColors,
};
