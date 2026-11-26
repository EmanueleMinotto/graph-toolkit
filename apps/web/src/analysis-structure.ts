import {
  bipartition,
  connectedComponents,
  dfs,
  hasCycle,
  isForest,
  isTree,
  stronglyConnectedComponents,
  topologicalSort,
  type Graph,
  type VertexId,
} from 'graph-toolkit';
import { NONE, type Highlight, type Selection } from './analysis-types.js';

export type StructureKind =
  'dfs' | 'components' | 'scc' | 'topological' | 'cycle' | 'tree' | 'bipartite';

type Groups = readonly (readonly VertexId[])[];

const plural = (count: number, word: string): string => `${count} ${word}${count === 1 ? '' : 's'}`;

/** One palette index per group, plus a group → members table. */
function groupsOf(groups: Groups, word: string): Highlight {
  return {
    ...NONE,
    colors: new Map(groups.flatMap((members, index) => members.map((id) => [id, index] as const))),
    summary: plural(groups.length, word),
    table: groups.map((members, index) => [String(index + 1), members.join(', ')]),
  };
}

function depthFirst(graph: Graph, { from }: Selection): Highlight {
  if (from === undefined) {
    return { ...NONE, summary: 'Pick a start vertex.' };
  }
  const order = dfs(graph, from);
  return {
    ...NONE,
    colors: new Map(order.map((id) => [id, 1])),
    steps: order.map((vertex) => ({ vertex })),
    summary: `${order.length} vertices reached`,
    table: order.map((id, index) => [String(index + 1), id]),
  };
}

function topological(graph: Graph): Highlight {
  const order = topologicalSort(graph);
  if (order === undefined) {
    return { ...NONE, summary: 'No topological order: the graph has a cycle.' };
  }
  return {
    ...NONE,
    summary: `${order.length} vertices ordered`,
    table: order.map((id, index) => [String(index + 1), id]),
  };
}

function bipartite(graph: Graph): Highlight {
  const result = bipartition(graph);
  return result === undefined
    ? { ...NONE, summary: 'Not bipartite (odd cycle).' }
    : { ...NONE, colors: new Map(result.colors), summary: 'Bipartite: two sides found.' };
}

function treeCheck(graph: Graph): Highlight {
  if (isTree(graph)) {
    return { ...NONE, summary: 'A tree: connected and acyclic.' };
  }
  const kind = isForest(graph) ? 'a forest (acyclic, not connected)' : 'not a forest (has a cycle)';
  return { ...NONE, summary: `Not a tree: it is ${kind}.` };
}

export const structureAnalyses: Readonly<
  Record<StructureKind, (graph: Graph, selection: Selection) => Highlight>
> = {
  dfs: depthFirst,
  components: (graph) => groupsOf(connectedComponents(graph), 'component'),
  scc: (graph) => groupsOf(stronglyConnectedComponents(graph), 'strongly connected component'),
  topological: (graph) => topological(graph),
  cycle: (graph) => ({ ...NONE, summary: hasCycle(graph) ? 'Has a cycle.' : 'Acyclic.' }),
  tree: (graph) => treeCheck(graph),
  bipartite: (graph) => bipartite(graph),
};
