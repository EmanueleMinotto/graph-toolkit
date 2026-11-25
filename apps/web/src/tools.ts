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
