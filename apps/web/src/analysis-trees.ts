import {
  boruvkaMinimumSpanningForest,
  minimumSpanningForest,
  primMinimumSpanningForest,
  RootedTree,
  type Graph,
  type SpanningForest,
} from 'graph-toolkit';
import { edgeKey, NONE, type Highlight, type Selection } from './analysis-types.js';

export type TreeKind = 'mst' | 'prim' | 'boruvka' | 'rooted-tree' | 'lca';

function spanning(name: string, solve: (graph: Graph) => SpanningForest) {
  return (graph: Graph): Highlight => {
    const forest = solve(graph);

    return {
      ...NONE,
      edges: new Set(forest.edges.map((edge) => edgeKey(edge.source, edge.target, graph.directed))),
      steps: forest.edges.map((edge) => ({
        edge: edgeKey(edge.source, edge.target, graph.directed),
      })),
      summary: `${name}: total weight ${forest.totalWeight}`,
    };
  };
}

/** Colors each vertex by depth and lists parent and depth. */
function rooted(graph: Graph, { from }: Selection): Highlight {
  if (from === undefined) {
    return { ...NONE, summary: 'Pick the root vertex.' };
  }

  const tree = new RootedTree(graph, from);
  const ids = graph.vertices();
  const height = Math.max(...ids.map((id) => tree.depthOf(id)));

  return {
    ...NONE,
    colors: new Map(ids.map((id) => [id, tree.depthOf(id)])),
    summary: `Rooted at ${from}, height ${height}`,
    table: ids.map((id) => [id, `depth ${tree.depthOf(id)}, parent ${tree.parentOf(id) ?? '–'}`]),
  };
}

function ancestor(graph: Graph, { from, to }: Selection): Highlight {
  if (from === undefined || to === undefined) {
    return { ...NONE, summary: 'Pick two vertices.' };
  }

  const [root] = graph.vertices();

  if (root === undefined) {
    return { ...NONE, summary: 'The graph is empty.' };
  }

  const common = new RootedTree(graph, root).lowestCommonAncestor(from, to);

  return {
    ...NONE,
    colors: new Map([
      [from, 1],
      [to, 1],
      [common, 2],
    ]),
    summary: `Lowest common ancestor of ${from} and ${to} is ${common} (root ${root})`,
  };
}

export const treeAnalyses: Readonly<
  Record<TreeKind, (graph: Graph, selection: Selection) => Highlight>
> = {
  mst: spanning('Kruskal', (graph) => minimumSpanningForest(graph)),
  prim: spanning('Prim', (graph) => primMinimumSpanningForest(graph)),
  boruvka: spanning('Borůvka', (graph) => boruvkaMinimumSpanningForest(graph)),
  'rooted-tree': rooted,
  lca: ancestor,
};
