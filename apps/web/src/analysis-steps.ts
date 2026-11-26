import { type Graph, type ShortestPathTree, type VertexId } from 'graph-toolkit';
import { edgeKey, type Step } from './analysis-types.js';

/** Vertices by increasing distance, each revealed together with the edge that reaches it. */
export function settleOrder(
  graph: Graph,
  tree: ShortestPathTree,
  reached: readonly VertexId[],
): readonly Step[] {
  return reached
    .toSorted((left, right) => tree.distanceTo(left) - tree.distanceTo(right))
    .map((vertex) => {
      const path = tree.pathTo(vertex) ?? [];
      const [last, before] = [path.at(-1), path.at(-2)];
      const edge =
        last === undefined || before === undefined
          ? undefined
          : edgeKey(before, last, graph.directed);

      return edge === undefined ? { vertex } : { vertex, edge };
    });
}
