import {
  aStar,
  GraphBuilder,
  bellmanFord,
  dijkstra,
  eulerianTrail,
  floydWarshall,
  hamiltonianCycle,
  hamiltonianPath,
  kShortestPaths,
  type Graph,
  type ShortestPathTree,
  type VertexId,
} from 'graph-toolkit';
import { settleOrder } from './analysis-steps.js';
import { NONE, pathEdges, type Highlight, type Selection } from './analysis-types.js';

export type PathKind =
  | 'distances'
  | 'bellman-ford'
  | 'floyd-warshall'
  | 'astar'
  | 'k-shortest'
  | 'eulerian'
  | 'hamiltonian-path'
  | 'hamiltonian-cycle';

const MAX_ROWS = 500;
const DEFAULT_COUNT = 3;

type Rows = readonly (readonly [string, string])[];

const show = (distance: number): string => (Number.isFinite(distance) ? String(distance) : '∞');

const numbered = (ids: readonly VertexId[]): Rows =>
  ids.map((id, index) => [String(index + 1), id]);

const highlightPath = (
  graph: Graph,
  path: readonly VertexId[],
): Pick<Highlight, 'colors' | 'edges'> => ({
  colors: new Map(path.map((id) => [id, 1])),
  edges: pathEdges(path, graph.directed),
});

function fromSource(solve: (graph: Graph, source: VertexId) => ShortestPathTree, name: string) {
  return (graph: Graph, { from }: Selection): Highlight => {
    if (from === undefined) {
      return { ...NONE, summary: 'Pick a start vertex.' };
    }
    const tree = solve(graph, from);
    const reached = graph.vertices().filter((id) => tree.distanceTo(id) !== Infinity);
    return {
      colors: new Map(reached.map((id) => [id, 1])),
      edges: new Set(
        reached.flatMap((id) => [...pathEdges(tree.pathTo(id) ?? [], graph.directed)]),
      ),
      steps: settleOrder(graph, tree, reached),
      summary: `${name}: ${reached.length} of ${graph.vertexCount} vertices reachable`,
      table: graph.vertices().map((id) => [id, show(tree.distanceTo(id))]),
    };
  };
}

function allPairs(graph: Graph): Highlight {
  const matrix = floydWarshall(graph);
  const ids = graph.vertices();
  const rows: Rows = ids
    .values()
    .flatMap((a) =>
      ids
        .values()
        .filter((b) => b !== a)
        .map((b) => [a, b] as const),
    )
    .take(MAX_ROWS)
    .map(([a, b]): readonly [string, string] => [`${a} → ${b}`, show(matrix.distance(a, b))])
    .toArray();
  const total = ids.length * (ids.length - 1);
  const shown = total > rows.length ? `, first ${rows.length} shown` : '';
  return { ...NONE, summary: `${total} ordered pairs${shown}`, table: rows };
}

/** Hop count from every vertex to `target`: unit-weight Dijkstra on the reversed graph. */
function hopsTo(graph: Graph, target: VertexId): ShortestPathTree {
  const builder = new GraphBuilder({ directed: graph.directed, allowParallelEdges: true });
  for (const id of graph.vertices()) {
    builder.addVertex(id);
  }
  for (const edge of graph.edges()) {
    builder.addEdge(edge.target, edge.source);
  }
  return dijkstra(builder.build(), target);
}

/** Admissible and consistent: no edge is cheaper than the lightest one, so hops × min weight. */
function aStarSearch(graph: Graph, { from, to }: Selection): Highlight {
  if (from === undefined || to === undefined) {
    return { ...NONE, summary: 'Pick two vertices.' };
  }
  const lightest = graph
    .edges()
    .values()
    .map((edge) => edge.weight)
    .reduce((least, weight) => Math.min(least, weight), Infinity);
  const hops = hopsTo(graph, to);
  const found = aStar(graph, {
    source: from,
    target: to,
    heuristic: (id) => (Number.isFinite(hops.distanceTo(id)) ? hops.distanceTo(id) * lightest : 0),
  });
  if (found === undefined) {
    return { ...NONE, summary: 'Unreachable.' };
  }
  return {
    ...highlightPath(graph, found.path),
    summary: `A* distance ${found.distance} via ${found.path.join(' → ')}`,
  };
}

function kShortest(graph: Graph, { from, to, count = DEFAULT_COUNT }: Selection): Highlight {
  if (from === undefined || to === undefined) {
    return { ...NONE, summary: 'Pick two vertices.' };
  }
  const found = kShortestPaths(graph, { source: from, target: to, count });
  const [best] = found;
  if (best === undefined) {
    return { ...NONE, summary: 'Unreachable.' };
  }
  return {
    ...highlightPath(graph, best.path),
    summary: `${found.length} loopless path${found.length === 1 ? '' : 's'}, best ${best.distance}`,
    table: found.map((entry, index) => [
      `#${index + 1} (${entry.distance})`,
      entry.path.join(' → '),
    ]),
  };
}

function sequence(graph: Graph, trail: readonly VertexId[] | undefined, label: string): Highlight {
  return trail === undefined
    ? { ...NONE, summary: `No ${label}.` }
    : { ...highlightPath(graph, trail), summary: `${label} found`, table: numbered(trail) };
}

export const pathAnalyses: Readonly<
  Record<PathKind, (graph: Graph, selection: Selection) => Highlight>
> = {
  distances: fromSource((graph, source) => dijkstra(graph, source), 'Dijkstra'),
  'bellman-ford': fromSource((graph, source) => bellmanFord(graph, source), 'Bellman-Ford'),
  'floyd-warshall': (graph) => allPairs(graph),
  astar: aStarSearch,
  'k-shortest': kShortest,
  eulerian: (graph) => sequence(graph, eulerianTrail(graph), 'Eulerian trail'),
  'hamiltonian-path': (graph) => sequence(graph, hamiltonianPath(graph), 'Hamiltonian path'),
  'hamiltonian-cycle': (graph) => sequence(graph, hamiltonianCycle(graph), 'Hamiltonian cycle'),
};
