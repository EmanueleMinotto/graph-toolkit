import {
  circularLayout,
  forceLayout,
  gridLayout,
  layeredLayout,
  type Graph,
  type Layout,
} from 'graph-toolkit';

export type LayoutKind = 'force' | 'circular' | 'grid' | 'layered';

export const LAYOUTS: readonly LayoutKind[] = ['force', 'circular', 'grid', 'layered'];

const FULL_QUALITY_VERTICES = 200;
const FULL_ITERATIONS = 300;
const MIN_ITERATIONS = 30;

/** Force layout is O(V²) per iteration: scale iterations down so large graphs stay interactive. */
const forceIterations = (vertexCount: number): number =>
  Math.max(
    MIN_ITERATIONS,
    Math.floor(FULL_ITERATIONS * Math.min(1, (FULL_QUALITY_VERTICES / vertexCount) ** 2)),
  );

const layouts: Readonly<Record<LayoutKind, (graph: Graph) => Layout>> = {
  force: (graph) => forceLayout(graph, { iterations: forceIterations(graph.vertexCount) }),
  circular: (graph) => circularLayout(graph),
  grid: (graph) => gridLayout(graph),
  layered: (graph) => layeredLayout(graph),
};

export const computeLayout = (kind: LayoutKind, graph: Graph): Layout => layouts[kind](graph);
