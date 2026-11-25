import { GraphError, type Graph } from '@graph-toolkit/core';
import { biconnectedBlocks, symmetricAdjacency } from './internal/biconnected.js';
import { isBlockPlanar } from './internal/dmp.js';

const MIN_BLOCK_EDGES = 3;

const pairsOf = (graph: Graph): readonly (readonly [number, number])[] =>
  graph.edges().map((edge) => [graph.indexOf(edge.source), graph.indexOf(edge.target)] as const);

/**
 * Planarity test of an undirected graph (self-loops ignored): splits into biconnected blocks and
 * runs the Demoucron–Malgrange–Pertuiset algorithm on each, O(V²) per block.
 */
export function isPlanar(graph: Graph): boolean {
  if (graph.directed) throw new GraphError('isPlanar requires an undirected graph');
  return biconnectedBlocks(symmetricAdjacency(graph.vertexCount, pairsOf(graph))).every(
    (block) => block.length < MIN_BLOCK_EDGES || isBlockPlanar(block),
  );
}
