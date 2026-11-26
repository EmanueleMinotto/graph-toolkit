import { type Highlight } from './analysis-types.js';

const defined = <T>(values: readonly (T | undefined)[]): readonly T[] =>
  values.filter((value) => value !== undefined);

/** `result` as it looks after its first `count` steps (everything when it has no steps). */
export function reveal(result: Highlight, count: number): Highlight {
  const { steps } = result;

  if (steps === undefined) {
    return result;
  }

  const shown = steps.slice(0, count);
  const vertices = new Set(defined(shown.map((step) => step.vertex)));
  const edges = new Set(defined(shown.map((step) => step.edge)));
  const hasVertices = steps.some((step) => step.vertex !== undefined);
  const hasEdges = steps.some((step) => step.edge !== undefined);

  return {
    ...result,
    colors: hasVertices
      ? new Map([...result.colors].filter(([id]) => vertices.has(id)))
      : result.colors,
    edges: hasEdges ? result.edges.intersection(edges) : result.edges,
  };
}
