import { GraphError, type Graph, type VertexId } from '@graph-sdk/core';
import { topologicalSort } from '@graph-sdk/traversal';
import { dagKernel, johnsonKernel } from './internal/johnson.js';
import {
  bellmanFordKernel,
  dijkstraKernel,
  distanceAt,
  floydWarshallKernel,
  hasNegativeDiagonal,
  hasNegativeWeight,
  matrixCell,
  traceBack,
  type Distances,
} from './internal/shortest.js';

/** Raised when a negative-weight cycle makes shortest paths undefined. */
export class NegativeCycleError extends GraphError {}

/** Single-source shortest-path result. */
export class ShortestPathTree {
  readonly #graph: Graph;
  readonly #result: Distances;

  public constructor(graph: Graph, result: Distances) {
    this.#graph = graph;
    this.#result = result;
  }

  /** Distance from the source, `Infinity` when unreachable. */
  public distanceTo(target: VertexId): number {
    return distanceAt(this.#result.distances, this.#graph.indexOf(target));
  }

  /** Vertices from source to `target`, or `undefined` when unreachable. */
  public pathTo(target: VertexId): readonly VertexId[] | undefined {
    const index = this.#graph.indexOf(target);
    return distanceAt(this.#result.distances, index) === Infinity
      ? undefined
      : traceBack(this.#result.predecessors, index).map((vertex) => this.#graph.vertexAt(vertex));
  }
}

/** Dijkstra, O((V + E) log V). Throws {@link GraphError} on negative weights. */
export function dijkstra(graph: Graph, source: VertexId): ShortestPathTree {
  if (hasNegativeWeight(graph.csr)) {
    throw new GraphError('dijkstra requires non-negative weights');
  }
  const result = dijkstraKernel(graph.csr, graph.vertexCount, graph.indexOf(source));
  return new ShortestPathTree(graph, result);
}

/** Bellman-Ford, O(V·E). Throws {@link NegativeCycleError} when a negative cycle is reachable. */
export function bellmanFord(graph: Graph, source: VertexId): ShortestPathTree {
  const result = bellmanFordKernel(graph.csr, graph.vertexCount, graph.indexOf(source));
  if (result === undefined) {
    throw new NegativeCycleError('Negative cycle reachable from source');
  }
  return new ShortestPathTree(graph, result);
}

/** All-pairs shortest distances. */
export class DistanceMatrix {
  readonly #graph: Graph;
  readonly #cells: Float64Array;

  public constructor(graph: Graph, cells: Float64Array) {
    this.#graph = graph;
    this.#cells = cells;
  }

  /** Distance `from` → `to`, `Infinity` when unreachable. */
  public distance(from: VertexId, to: VertexId): number {
    const size = this.#graph.vertexCount;
    return matrixCell(this.#cells, this.#graph.indexOf(from) * size + this.#graph.indexOf(to));
  }
}

/** Floyd-Warshall, O(V³) time, O(V²) space. Throws {@link NegativeCycleError}. */
export function floydWarshall(graph: Graph): DistanceMatrix {
  const cells = floydWarshallKernel(graph.csr, graph.vertexCount);
  if (hasNegativeDiagonal(cells, graph.vertexCount)) {
    throw new NegativeCycleError('Graph contains a negative cycle');
  }
  return new DistanceMatrix(graph, cells);
}

/**
 * Johnson all-pairs shortest paths, O(V·E log V): better than {@link floydWarshall} on sparse
 * graphs, and supports negative weights. Throws {@link NegativeCycleError}.
 */
export function johnson(graph: Graph): DistanceMatrix {
  const cells = johnsonKernel(graph.csr, graph.vertexCount);
  if (cells === undefined) {
    throw new NegativeCycleError('Graph contains a negative cycle');
  }
  return new DistanceMatrix(graph, cells);
}

/** Single-source shortest paths on a DAG in O(V + E); negative weights allowed. */
export function dagShortestPaths(graph: Graph, source: VertexId): ShortestPathTree {
  const order = topologicalSort(graph);
  if (order === undefined || !graph.directed) {
    throw new GraphError('dagShortestPaths requires a directed acyclic graph');
  }
  const indices = order.map((id) => graph.indexOf(id));
  return new ShortestPathTree(graph, dagKernel(graph.csr, indices, graph.indexOf(source)));
}
