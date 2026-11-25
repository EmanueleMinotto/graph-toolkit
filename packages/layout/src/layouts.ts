import type { Graph, VertexId } from '@graph-toolkit/core';
import { coordinate, forceKernel } from './internal/force.js';
import { layer, placementAt } from './internal/layered.js';

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
