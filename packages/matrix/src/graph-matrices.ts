import { GraphBuilder, GraphError, vertexId, type Graph, type VertexId } from '@graph-sdk/core';
import {
  adjacencyData,
  incidenceData,
  isSymmetric,
  laplacianData,
  nonZeroEntries,
} from './internal/dense.js';
import { Matrix } from './matrix.js';

export interface MatrixOptions {
  /** Use edge weights instead of 1 (default false). */
  readonly isWeighted?: boolean;
}

/** Adjacency matrix in vertex insertion order. */
export function adjacencyMatrix(graph: Graph, options: MatrixOptions = {}): Matrix {
  const { vertexCount } = graph;
  const data = adjacencyData(graph.csr, vertexCount, options.isWeighted ?? false);
  return new Matrix(vertexCount, vertexCount, data);
}

/**
 * Vertex–edge incidence matrix (columns follow `graph.edges()`): undirected edges mark both
 * endpoints with 1; directed arcs use −1 at the source and +1 at the target.
 */
export function incidenceMatrix(graph: Graph): Matrix {
  const pairs = graph
    .edges()
    .map((edge) => [graph.indexOf(edge.source), graph.indexOf(edge.target)] as const);
  const data = incidenceData(graph.vertexCount, pairs, graph.directed);
  return new Matrix(graph.vertexCount, pairs.length, data);
}

/** Laplacian L = D − A of an undirected graph (rows sum to zero). */
export function laplacianMatrix(graph: Graph, options: MatrixOptions = {}): Matrix {
  if (graph.directed) throw new GraphError('laplacianMatrix requires an undirected graph');
  const adjacency = adjacencyMatrix(graph, options).toArray();
  return new Matrix(
    graph.vertexCount,
    graph.vertexCount,
    laplacianData(adjacency, graph.vertexCount),
  );
}

export interface FromMatrixOptions {
  readonly isDirected?: boolean;
}

function assertAdjacency(matrix: Matrix, isDirected: boolean): void {
  if (matrix.rows !== matrix.columns) throw new GraphError('adjacency matrix must be square');
  if (!isDirected && !isSymmetric(matrix.toArray(), matrix.rows)) {
    throw new GraphError('undirected adjacency matrix must be symmetric');
  }
}

const toVertexId = (index: number): VertexId => vertexId(String(index));

/** Builds a graph with vertices `"0"`..`"n-1"`; non-zero entries become weighted edges. */
export function graphFromAdjacency(matrix: Matrix, options: FromMatrixOptions = {}): Graph {
  const isDirected = options.isDirected ?? false;
  assertAdjacency(matrix, isDirected);
  const builder = new GraphBuilder({ directed: isDirected });
  const names = Array.from({ length: matrix.rows }, (_, index) => toVertexId(index));
  for (const name of names) builder.addVertex(name);
  const entries = nonZeroEntries(matrix.toArray(), matrix.rows, !isDirected);
  for (const [row, column, value] of entries) {
    builder.addEdge(toVertexId(row), toVertexId(column), value);
  }
  return builder.build();
}
