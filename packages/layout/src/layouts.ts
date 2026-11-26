import type { Graph, VertexId } from '@graph-sdk/core';
import { eigenDecomposition, Matrix } from '@graph-sdk/matrix';
import { coordinate, forceKernel } from './internal/force.js';
import { layer, placementAt } from './internal/layered.js';
import { ringsAround } from './internal/radial.js';
import { symmetricLaplacian } from './internal/spectral.js';
import { outerCycle, tutteEmbedding } from './internal/tutte.js';

export interface Point {
  readonly x: number;
  readonly y: number;
}

export type Layout = ReadonlyMap<VertexId, Point>;

const DEFAULT_ITERATIONS = 300;
const DEFAULT_SEED = 1;

/** Vertices evenly spaced on a circle of `radius` centered at the origin. */
export function circularLayout(graph: Graph, radius = 1): Layout {
  const count = graph.vertexCount;
  return new Map(
    graph.vertices().map((id, index) => {
      const angle = (2 * Math.PI * index) / count;
      return [id, { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }];
    }),
  );
}

/** Row-major square-ish grid with the given `spacing`. */
export function gridLayout(graph: Graph, spacing = 1): Layout {
  const columns = Math.max(1, Math.ceil(Math.sqrt(graph.vertexCount)));
  return new Map(
    graph
      .vertices()
      .map((id, index) => [
        id,
        { x: (index % columns) * spacing, y: Math.floor(index / columns) * spacing },
      ]),
  );
}

export interface ForceLayoutOptions {
  /** Default 300. */
  readonly iterations?: number;
  /** PRNG seed for the initial placement, default 1. */
  readonly seed?: number;
}

/** Force-directed (Fruchterman–Reingold) layout in [0, 1]², deterministic per seed. */
export function forceLayout(graph: Graph, options: ForceLayoutOptions = {}): Layout {
  const { iterations = DEFAULT_ITERATIONS, seed = DEFAULT_SEED } = options;
  const pos = forceKernel(graph.csr, graph.vertexCount, { iterations, seed });
  return new Map(
    graph
      .vertices()
      .map((id, index) => [
        id,
        { x: coordinate(pos, 2 * index), y: coordinate(pos, 2 * index + 1) },
      ]),
  );
}

export interface LayeredLayoutOptions {
  /** Vertical distance between layers, default 1. */
  readonly layerGap?: number;
  /** Horizontal distance between vertices of a layer, default 1. */
  readonly nodeGap?: number;
}

/**
 * Layered (hierarchical) layout: DAGs use longest-path layers, other graphs BFS depth; vertices
 * within a layer are ordered by barycenter sweeps. Layers grow downward (y), each centered on x = 0.
 */
export function layeredLayout(graph: Graph, options: LayeredLayoutOptions = {}): Layout {
  const { layerGap = 1, nodeGap = 1 } = options;
  const placement = layer(graph.csr, graph.vertexCount);
  return new Map(
    graph.vertices().map((id, index) => {
      const level = placementAt(placement.level, index);
      const width = placementAt(placement.widths, level);
      const offset = placementAt(placement.rank, index) - (width - 1) / 2;
      return [id, { x: offset * nodeGap, y: level * layerGap }];
    }),
  );
}

export interface RadialLayoutOptions {
  /** Center vertex, default the first one. */
  readonly root?: VertexId;
  /** Distance between consecutive rings, default 1. */
  readonly ringGap?: number;
}

/**
 * Radial layout: `root` at the origin, every other vertex on the ring matching its hop distance
 * (unreachable vertices share one extra outer ring), evenly spaced on each ring.
 */
export function radialLayout(graph: Graph, options: RadialLayoutOptions = {}): Layout {
  const { root = graph.vertices()[0], ringGap = 1 } = options;
  if (root === undefined) return new Map();
  const { ring, rank, sizes } = ringsAround(graph.csr, graph.vertexCount, graph.indexOf(root));
  return new Map(
    graph.vertices().map((id, index) => {
      const level = placementAt(ring, index);
      const angle = (2 * Math.PI * placementAt(rank, index)) / placementAt(sizes, level);
      const radius = level * ringGap;
      return [id, { x: radius * Math.cos(angle), y: radius * Math.sin(angle) }];
    }),
  );
}

/**
 * Spectral layout: x and y are the eigenvectors of the 2nd and 3rd smallest Laplacian eigenvalues
 * (edge directions ignored), which places strongly connected vertices close together. $O(V^3)$:
 * meant for graphs up to a few hundred vertices.
 */
export function spectralLayout(graph: Graph): Layout {
  const count = graph.vertexCount;
  const laplacian = new Matrix(count, count, symmetricLaplacian(graph.csr, count));
  const { vectors } = eigenDecomposition(laplacian);
  return new Map(
    graph
      .vertices()
      .map((id, index) => [id, { x: vectors[1]?.[index] ?? 0, y: vectors[2]?.[index] ?? 0 }]),
  );
}

/**
 * Tutte (barycentric) layout: the longest shortest-cycle found among the first edges is pinned to
 * a circle and every other vertex sits at the mean of its neighbors. It is a straight-line planar
 * drawing for 3-connected planar graphs; other graphs are drawn without that guarantee. Graphs
 * without a cycle fall back to {@link radialLayout}; vertices cut off from the cycle go on an
 * outer ring.
 */
export function tutteLayout(graph: Graph): Layout {
  const count = graph.vertexCount;
  const cycle = outerCycle(graph.csr, count);
  if (cycle.length === 0) return radialLayout(graph);
  const position = tutteEmbedding(graph.csr, count, cycle);
  return new Map(
    graph
      .vertices()
      .map((id, index) => [
        id,
        { x: coordinate(position, 2 * index), y: coordinate(position, 2 * index + 1) },
      ]),
  );
}
