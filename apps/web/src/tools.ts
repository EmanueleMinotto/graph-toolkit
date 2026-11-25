import { type Graph } from 'graph-toolkit';
import { type AnalysisKind } from './analysis.js';

export type Requirement = 'directed' | 'undirected';

/** A numeric input some tools need besides the clicked vertices (e.g. how many paths). */
export interface Param {
  readonly label: string;
  readonly initial: number;
  readonly min: number;
  readonly max: number;
  /** Increment; fractions (below 1) allow decimal input. */
  readonly step?: number;
}

export interface Tool {
  readonly id: AnalysisKind;
  readonly label: string;
  readonly group: string | undefined;
  /** How many vertices the user must click first. */
  readonly needs: 0 | 1 | 2;
  readonly requires?: Requirement;
  readonly param?: Param;
  /** Compares against the generated second graph. */
  readonly usesOther?: boolean;
}

type Extras = Pick<Tool, 'requires' | 'param' | 'usesOther'>;

type Entry = (
  id: AnalysisKind,
  label: string,
  extras?: Partial<Pick<Tool, 'needs'> & Extras>,
) => Tool;

const inGroup =
  (group: string): Entry =>
  (id, label, extras = {}) => ({ id, label, group, needs: 0, ...extras });

const NO_TOOL: Tool = { id: 'none', label: 'none', group: undefined, needs: 0 };
const undirected: Extras = { requires: 'undirected' };
const directed: Extras = { requires: 'directed' };

/** Registry of analysis tools: new tools are added here and in an `analysis-*.ts` module. */
const traversal = inGroup('Traversal');
const paths = inGroup('Paths');
const trails = inGroup('Trails');
const structure = inGroup('Structure');
const coloring = inGroup('Coloring');
const trees = inGroup('Trees');
const flows = inGroup('Flow and matching');
const ranking = inGroup('Centrality and communities');
const cliques = inGroup('Cliques and planarity');
const compare = inGroup('Compare');
const matrices = inGroup('Matrices');

export const TOOLS: readonly Tool[] = [
  NO_TOOL,
  traversal('bfs', 'BFS order', { needs: 1 }),
  traversal('dfs', 'DFS order', { needs: 1 }),
  paths('shortest-path', 'Shortest path', { needs: 2 }),
  paths('distances', 'Distances from vertex (Dijkstra)', { needs: 1 }),
  paths('bellman-ford', 'Distances, negative weights (Bellman-Ford)', { needs: 1 }),
  paths('floyd-warshall', 'All pairs (Floyd-Warshall)'),
  paths('johnson', 'All pairs (Johnson)'),
  paths('dag-distances', 'Distances on a DAG', { ...directed, needs: 1 }),
  paths('astar', 'A* search', { needs: 2 }),
  paths('k-shortest', 'k shortest paths', {
    needs: 2,
    param: { label: 'Paths (k)', initial: 3, min: 1, max: 20 },
  }),
  trails('eulerian', 'Eulerian trail'),
  trails('hamiltonian-path', 'Hamiltonian path'),
  trails('hamiltonian-cycle', 'Hamiltonian cycle'),
  structure('components', 'Connected components', undirected),
  structure('scc', 'Strongly connected components', directed),
  structure('topological', 'Topological order', directed),
  structure('cycle', 'Cycle detection'),
  structure('tree', 'Tree / forest check', undirected),
  structure('bipartite', 'Bipartition', undirected),
  structure('bridges', 'Bridges (cut edges)', undirected),
  structure('articulation', 'Articulation points', undirected),
  structure('blocks', 'Biconnected components', undirected),
  structure('k-cores', 'k-cores (core numbers)'),
  structure('clustering', 'Clustering coefficients'),
  structure('diameter', 'Diameter, radius and center'),
  structure('transitive-closure', 'Transitive closure', directed),
  coloring('coloring', 'DSATUR coloring', undirected),
  coloring('greedy-coloring', 'Greedy coloring (Welsh–Powell)', undirected),
  coloring('exact-coloring', 'Exact coloring (chromatic number)', undirected),
  coloring('edge-coloring', 'Edge coloring', undirected),
  trees('mst', 'Minimum spanning tree (Kruskal)', undirected),
  trees('prim', 'Minimum spanning tree (Prim)', undirected),
  trees('boruvka', 'Minimum spanning tree (Borůvka)', undirected),
  trees('arborescence', 'Minimum arborescence (Chu–Liu/Edmonds)', { ...directed, needs: 1 }),
  trees('rooted-tree', 'Rooted tree: depth and parent', { ...undirected, needs: 1 }),
  trees('lca', 'Lowest common ancestor', { ...undirected, needs: 2 }),
  flows('max-flow', 'Max flow (Edmonds–Karp)', { ...directed, needs: 2 }),
  flows('max-flow-dinic', 'Max flow (Dinic)', { ...directed, needs: 2 }),
  flows('min-cut', 'Minimum cut', { ...directed, needs: 2 }),
  flows('blossom', 'General matching (blossom)', undirected),
  flows('matching', 'Bipartite matching (Hopcroft–Karp)', undirected),
  ranking('pagerank', 'PageRank', {
    param: { label: 'Damping', initial: 0.85, min: 0.05, max: 0.99, step: 0.05 },
  }),
  ranking('degree', 'Degree centrality'),
  ranking('closeness', 'Closeness centrality'),
  ranking('betweenness', 'Betweenness centrality'),
  ranking('communities', 'Communities (modularity)', {
    param: { label: 'Max rounds', initial: 100, min: 1, max: 1000 },
  }),
  cliques('maximal-cliques', 'Maximal cliques', undirected),
  cliques('maximum-clique', 'Maximum clique', undirected),
  cliques('planar', 'Planarity test', undirected),
  compare('isomorphism', 'Isomorphism with second graph', { usesOther: true }),
  matrices('adjacency', 'Adjacency matrix'),
  matrices('weighted-adjacency', 'Weighted adjacency matrix'),
  matrices('laplacian', 'Laplacian matrix', undirected),
  matrices('spectrum', 'Adjacency spectrum', undirected),
  matrices('adjacency-power', 'Walk counts (adjacency power)', {
    param: { label: 'Length (k)', initial: 2, min: 1, max: 20 },
  }),
];

export const toolOf = (id: AnalysisKind): Tool => TOOLS.find((entry) => entry.id === id) ?? NO_TOOL;

/** Why `tool` cannot run on `graph`, or `undefined` when it can. */
export function unavailableReason(entry: Tool, graph: Graph): string | undefined {
  if (entry.requires === 'undirected' && graph.directed) return 'needs an undirected graph';
  if (entry.requires === 'directed' && !graph.directed) return 'needs a directed graph';
  return undefined;
}
