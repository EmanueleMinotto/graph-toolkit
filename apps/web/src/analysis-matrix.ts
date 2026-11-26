import { adjacencyMatrix, laplacianMatrix, type Graph, type Matrix } from 'graph-toolkit';
import { NONE, type Highlight, type Selection } from './analysis-types.js';

export type MatrixKind = 'adjacency' | 'weighted-adjacency' | 'laplacian' | 'adjacency-power';

/** Larger matrices are not rendered: the grid would be unreadable and slow. */
const MAX_DISPLAY = 40;

function show(graph: Graph, summary: string, build: () => Matrix): Highlight {
  const size = graph.vertexCount;

  return size > MAX_DISPLAY
    ? { ...NONE, summary: `${size} × ${size} is too large to display (limit ${MAX_DISPLAY})` }
    : { ...NONE, summary, matrix: { labels: graph.vertices(), rows: build().toRows() } };
}

export const matrixAnalyses: Readonly<
  Record<MatrixKind, (graph: Graph, selection: Selection) => Highlight>
> = {
  adjacency: (graph) => show(graph, 'Adjacency matrix', () => adjacencyMatrix(graph)),
  'weighted-adjacency': (graph) =>
    show(graph, 'Weighted adjacency matrix', () => adjacencyMatrix(graph, { isWeighted: true })),
  laplacian: (graph) => show(graph, 'Laplacian matrix', () => laplacianMatrix(graph)),
  'adjacency-power': (graph, { count = 2 }) =>
    show(graph, `Walks of length ${count} (A^${count})`, () => adjacencyMatrix(graph).power(count)),
};
