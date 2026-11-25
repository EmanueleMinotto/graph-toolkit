import { type Graph } from 'graph-toolkit';
import { type AnalysisKind } from './analysis.js';

export type Requirement = 'directed' | 'undirected';

export interface Tool {
  readonly id: AnalysisKind;
  readonly label: string;
  readonly group: string | undefined;
  /** How many vertices the user must click first. */
  readonly needs: 0 | 1 | 2;
  readonly requires?: Requirement;
}

/** Registry of analysis tools: new tools are added here and in `analysis.ts`. */
const NO_TOOL: Tool = { id: 'none', label: 'none', group: undefined, needs: 0 };

export const TOOLS: readonly Tool[] = [
  NO_TOOL,
  { id: 'bfs', label: 'BFS order', group: 'Traversal', needs: 1 },
  { id: 'dfs', label: 'DFS order', group: 'Traversal', needs: 1 },
  {
    id: 'components',
    label: 'Connected components',
    group: 'Structure',
    needs: 0,
    requires: 'undirected',
  },
  {
    id: 'scc',
    label: 'Strongly connected components',
    group: 'Structure',
    needs: 0,
    requires: 'directed',
  },
  {
    id: 'topological',
    label: 'Topological order',
    group: 'Structure',
    needs: 0,
    requires: 'directed',
  },
  { id: 'cycle', label: 'Cycle detection', group: 'Structure', needs: 0 },
  {
    id: 'tree',
    label: 'Tree / forest check',
    group: 'Structure',
    needs: 0,
    requires: 'undirected',
  },
  { id: 'bipartite', label: 'Bipartition', group: 'Structure', needs: 0, requires: 'undirected' },
  { id: 'shortest-path', label: 'Shortest path', group: 'Paths', needs: 2 },
  { id: 'coloring', label: 'DSATUR coloring', group: 'Coloring', needs: 0, requires: 'undirected' },
  { id: 'mst', label: 'Minimum spanning tree', group: 'Trees', needs: 0, requires: 'undirected' },
];

export const toolOf = (id: AnalysisKind): Tool => TOOLS.find((tool) => tool.id === id) ?? NO_TOOL;

/** Why `tool` cannot run on `graph`, or `undefined` when it can. */
export function unavailableReason(tool: Tool, graph: Graph): string | undefined {
  if (tool.requires === 'undirected' && graph.directed) return 'needs an undirected graph';
  if (tool.requires === 'directed' && !graph.directed) return 'needs a directed graph';
  return undefined;
}
