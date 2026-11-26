import { GraphBuilder, GraphError, type Graph, type VertexId } from '@graph-sdk/core';
import { biconnectedBlocks, symmetricAdjacency, type Pair } from './internal/biconnected.js';
import {
  articulationIndices,
  blockVertices,
  bridgePairs,
  clustering,
  coreNumbers,
  hopDistances,
  minDegreeWidth,
  reachablePairs,
  symmetricSets,
} from './internal/structure.js';
import { valueAt } from './internal/access.js';
import type { Scores } from './centrality.js';

function undirectedBlocks(graph: Graph, name: string): readonly (readonly Pair[])[] {
  if (graph.directed) {
    throw new GraphError(`${name} requires an undirected graph`);
  }

  const pairs = graph
    .edges()
    .map((edge): Pair => [graph.indexOf(edge.source), graph.indexOf(edge.target)]);

  return biconnectedBlocks(symmetricAdjacency(graph.vertexCount, pairs));
}

const named = (graph: Graph, indices: readonly number[]): readonly VertexId[] =>
  indices.map((index) => graph.vertexAt(index));

/** Biconnected components (vertex sets; they overlap only at articulation points). $O(V + E)$. */
export function biconnectedComponents(graph: Graph): readonly (readonly VertexId[])[] {
  return blockVertices(undirectedBlocks(graph, 'biconnectedComponents')).map((block) =>
    named(graph, block),
  );
}

/** Cut vertices of an undirected graph: removing one disconnects its component. $O(V + E)$. */
export function articulationPoints(graph: Graph): readonly VertexId[] {
  return named(graph, articulationIndices(undirectedBlocks(graph, 'articulationPoints')));
}

/** Cut edges of an undirected graph (blocks made of a single edge). $O(V + E)$. */
export function bridges(graph: Graph): readonly (readonly [VertexId, VertexId])[] {
  return bridgePairs(undirectedBlocks(graph, 'bridges')).map(
    ([from, to]) => [graph.vertexAt(from), graph.vertexAt(to)] as const,
  );
}

const scoresOf = (graph: Graph, values: ArrayLike<number>): Scores =>
  new Map(graph.vertices().map((id) => [id, valueAt(values, graph.indexOf(id))]));

/** Core number of each vertex (largest k whose k-core contains it); edge directions ignored. */
export function kCores(graph: Graph): Scores {
  return scoresOf(graph, coreNumbers(symmetricSets(graph.csr, graph.vertexCount)));
}

/** Local clustering coefficient (closed triangles / possible); edge directions ignored. */
export function clusteringCoefficients(graph: Graph): Scores {
  const adjacency = symmetricSets(graph.csr, graph.vertexCount);

  return new Map(graph.vertices().map((id) => [id, clustering(adjacency, graph.indexOf(id))]));
}

/** Mean of the local clustering coefficients (0 for an empty graph). */
export function averageClustering(graph: Graph): number {
  const values = [...clusteringCoefficients(graph).values()];

  return values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;
}

/** Largest hop distance from each vertex; `Infinity` if some vertex is unreachable. $O(V \cdot (V + E))$. */
export function eccentricities(graph: Graph): Scores {
  return new Map(
    graph.vertices().map((id) => [id, Math.max(...hopDistances(graph.csr, graph.indexOf(id)))]),
  );
}

/** Maximum eccentricity (hop distance); `Infinity` if disconnected, 0 for an empty graph. */
export function diameter(graph: Graph): number {
  return Math.max(0, ...eccentricities(graph).values());
}

/** Minimum eccentricity (hop distance); 0 for an empty graph. */
export function radius(graph: Graph): number {
  return graph.vertexCount === 0 ? 0 : Math.min(...eccentricities(graph).values());
}

/** Vertices whose eccentricity equals the radius. */
export function center(graph: Graph): readonly VertexId[] {
  const eccentricity = eccentricities(graph);
  const least = radius(graph);

  return graph.vertices().filter((id) => eccentricity.get(id) === least);
}

/** Directed graph with an arc u→v whenever v ≠ u is reachable from u. $O(V \cdot (V + E))$. */
export function transitiveClosure(graph: Graph): Graph {
  const builder = new GraphBuilder({ directed: true });

  for (const id of graph.vertices()) {
    builder.addVertex(id);
  }

  for (const [from, to] of reachablePairs(graph.csr, graph.vertexCount)) {
    builder.addEdge(graph.vertexAt(from), graph.vertexAt(to));
  }

  return builder.build();
}

/**
 * Upper bound on the treewidth by min-degree elimination (exact for trees, cycles and cliques;
 * edge directions ignored). 0 for graphs without edges.
 */
export function treewidthUpperBound(graph: Graph): number {
  return minDegreeWidth(symmetricSets(graph.csr, graph.vertexCount));
}
