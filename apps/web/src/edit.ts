import { GraphBuilder, vertexId, type Edge, type Graph, type VertexId } from 'graph-toolkit';

/** Always allows parallel edges: duplicate checks are made by `addEdge` so users can opt in. */
function rebuild(graph: Graph, vertices: readonly VertexId[], edges: readonly Edge[]): Graph {
  const builder = new GraphBuilder({ directed: graph.directed, allowParallelEdges: true });

  for (const vertex of vertices) {
    builder.addVertex(vertex);
  }

  for (const edge of edges) {
    builder.addEdge(edge.source, edge.target, edge.weight);
  }

  return builder.build();
}

/** Smallest non-negative integer id not used yet. */
export function nextVertexId(graph: Graph): VertexId {
  const used = new Set<string>(graph.vertices());
  const free = Array.from({ length: used.size + 1 }, (_, index) => String(index));

  return vertexId(free.find((candidate) => !used.has(candidate)) ?? String(used.size));
}

/** Two endpoints; `connects` also matches the reverse orientation in undirected graphs. */
export type Ends = Pick<Edge, 'source' | 'target'>;

const matches = (edge: Edge, source: string, target: string): boolean =>
  edge.source === source && edge.target === target;

const connects = (graph: Graph, edge: Edge, ends: Ends): boolean =>
  matches(edge, ends.source, ends.target) ||
  (!graph.directed && matches(edge, ends.target, ends.source));

export const addVertex = (graph: Graph, id: VertexId): Graph =>
  rebuild(graph, [...graph.vertices(), id], graph.edges());

export function addEdge(graph: Graph, edge: Edge, allowParallel: boolean): Graph {
  if (!allowParallel && graph.hasEdge(edge.source, edge.target)) {
    throw new Error(`Edge ${edge.source} → ${edge.target} already exists (enable parallel edges)`);
  }

  return rebuild(graph, graph.vertices(), [...graph.edges(), edge]);
}

export const removeVertices = (graph: Graph, ids: ReadonlySet<VertexId>): Graph =>
  rebuild(
    graph,
    graph.vertices().filter((vertex) => !ids.has(vertex)),
    graph.edges().filter((edge) => !ids.has(edge.source) && !ids.has(edge.target)),
  );

export const removeVertex = (graph: Graph, id: VertexId): Graph =>
  removeVertices(graph, new Set([id]));

/** Removes every edge between the two endpoints (both orientations when undirected). */
export const removeEdges = (graph: Graph, ends: Ends): Graph =>
  rebuild(
    graph,
    graph.vertices(),
    graph.edges().filter((edge) => !connects(graph, edge, ends)),
  );

/** Sets the weight of every edge between the two endpoints. */
export const setWeight = (graph: Graph, ends: Ends, weight: number): Graph =>
  rebuild(
    graph,
    graph.vertices(),
    graph.edges().map((edge) => (connects(graph, edge, ends) ? { ...edge, weight } : edge)),
  );
