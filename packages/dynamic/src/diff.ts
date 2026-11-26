import {
  GraphBuilder,
  GraphError,
  type Edge,
  type Graph,
  type VertexId,
  type Weight,
} from '@graph-sdk/core';

/** An edge whose weight differs between the two graphs. */
export interface EdgeChange {
  readonly source: VertexId;
  readonly target: VertexId;
  readonly before: Weight;
  readonly after: Weight;
}

/**
 * What separates two graphs. Edges removed together with a removed vertex are listed too, so a
 * diff can be inverted without looking at either graph.
 */
export interface GraphDiff {
  readonly directed: boolean;
  readonly addedVertices: readonly VertexId[];
  readonly removedVertices: readonly VertexId[];
  readonly addedEdges: readonly Edge[];
  readonly removedEdges: readonly Edge[];
  readonly reweightedEdges: readonly EdgeChange[];
}

const compare = (left: string, right: string): number =>
  Number(left > right) - Number(left < right);

const edgeKey = (graph: Graph, { source, target }: Edge): string =>
  JSON.stringify(graph.directed ? [source, target] : [source, target].toSorted(compare));

const plain = ({ source, target, weight }: Edge): Edge => ({ source, target, weight });

const edgeMap = (graph: Graph): ReadonlyMap<string, Edge> =>
  new Map(graph.edges().map((edge) => [edgeKey(graph, edge), edge]));

const reweightsOf = (
  oldEdges: ReadonlyMap<string, Edge>,
  newEdges: ReadonlyMap<string, Edge>,
): readonly EdgeChange[] =>
  [...newEdges]
    .map(([key, edge]) => [oldEdges.get(key), edge] as const)
    .filter(
      (pair): pair is readonly [Edge, Edge] =>
        pair[0] !== undefined && pair[0].weight !== pair[1].weight,
    )
    .map(([old, edge]) => ({
      source: old.source,
      target: old.target,
      before: old.weight,
      after: edge.weight,
    }));

const missingFrom = (
  from: ReadonlyMap<string, Edge>,
  other: ReadonlyMap<string, Edge>,
): readonly Edge[] => [...from].filter(([key]) => !other.has(key)).map(([, edge]) => plain(edge));

/**
 * Differences from `before` to `after`. Compares vertex ids and edge endpoints and weights; vertex
 * and edge attributes are ignored, and parallel edges collapse onto one (simple graphs only).
 * Throws {@link GraphError} when the graphs differ in direction.
 */
export function diffGraphs(before: Graph, after: Graph): GraphDiff {
  if (before.directed !== after.directed) {
    throw new GraphError('Cannot diff a directed graph against an undirected one');
  }

  const oldEdges = edgeMap(before);
  const newEdges = edgeMap(after);

  return {
    directed: before.directed,
    addedVertices: after.vertices().filter((id) => !before.hasVertex(id)),
    removedVertices: before.vertices().filter((id) => !after.hasVertex(id)),
    addedEdges: missingFrom(newEdges, oldEdges),
    removedEdges: missingFrom(oldEdges, newEdges),
    reweightedEdges: reweightsOf(oldEdges, newEdges),
  };
}

/** The diff that undoes `diff`. */
export const invertDiff = (diff: GraphDiff): GraphDiff => ({
  directed: diff.directed,
  addedVertices: diff.removedVertices,
  removedVertices: diff.addedVertices,
  addedEdges: diff.removedEdges,
  removedEdges: diff.addedEdges,
  reweightedEdges: diff.reweightedEdges.map(({ source, target, before, after }) => ({
    source,
    target,
    before: after,
    after: before,
  })),
});

export const isEmptyDiff = (diff: GraphDiff): boolean =>
  diff.addedVertices.length +
    diff.removedVertices.length +
    diff.addedEdges.length +
    diff.removedEdges.length +
    diff.reweightedEdges.length ===
  0;

/** Removes and then adds what `diff` lists, in an order that never leaves an edge dangling. */
function edit(builder: GraphBuilder, diff: GraphDiff): GraphBuilder {
  for (const { source, target } of [...diff.removedEdges, ...diff.reweightedEdges]) {
    builder.removeEdge(source, target);
  }

  for (const id of diff.removedVertices) {
    builder.removeVertex(id);
  }

  for (const id of diff.addedVertices) {
    builder.addVertex(id);
  }

  for (const { source, target, weight } of diff.addedEdges) {
    builder.addEdge(source, target, weight);
  }

  for (const { source, target, after } of diff.reweightedEdges) {
    builder.addEdge(source, target, after);
  }

  return builder;
}

/**
 * A new graph with `diff` applied to `graph`. Vertex and edge attributes of what stays are kept;
 * added vertices and edges carry none. Throws {@link GraphError} when the directions differ, and
 * the usual graph errors when the diff does not fit `graph`.
 */
export function applyDiff(graph: Graph, diff: GraphDiff): Graph {
  if (graph.directed !== diff.directed) {
    throw new GraphError('Cannot apply a directed diff to an undirected graph or vice versa');
  }

  return edit(GraphBuilder.from(graph), diff).build();
}
