import { GraphBuilder, vertexId, type Graph } from '@graph-toolkit/core';
import {
  completePairs,
  cyclePairs,
  gridPairs,
  pathPairs,
  randomPairs,
  starPairs,
  type Pair,
} from './internal/edge-lists.js';
import { fixedSizePairs, preferentialPairs, smallWorldPairs } from './internal/random-pairs.js';
import {
  binaryTreePairs,
  completeBipartitePairs,
  hypercubePairs,
  petersenPairs,
  wheelPairs,
} from './internal/structured-pairs.js';

export interface GeneratorOptions {
  readonly directed?: boolean;
}

/** Vertices are named `"0"`..`"n-1"`. */
function assemble(count: number, pairs: readonly Pair[], options: GeneratorOptions): Graph {
  const builder = new GraphBuilder({ directed: options.directed ?? false });
  const names = Array.from({ length: count }, (_, index) => String(index));
  for (const name of names) builder.addVertex(vertexId(name));
  for (const [from, to] of pairs) builder.addEdge(vertexId(String(from)), vertexId(String(to)));
  return builder.build();
}

export const pathGraph = (count: number, options: GeneratorOptions = {}): Graph =>
  assemble(count, pathPairs(count), options);

export const cycleGraph = (count: number, options: GeneratorOptions = {}): Graph =>
  assemble(count, cyclePairs(count), options);

export const completeGraph = (count: number, options: GeneratorOptions = {}): Graph =>
  assemble(count, completePairs(count), options);

export const starGraph = (count: number, options: GeneratorOptions = {}): Graph =>
  assemble(count, starPairs(count), options);

export const gridGraph = (rows: number, columns: number, options: GeneratorOptions = {}): Graph =>
  assemble(rows * columns, gridPairs(rows, columns), options);

export interface RandomGraphOptions extends GeneratorOptions {
  /** Probability in [0, 1] that each pair is connected. */
  readonly probability: number;
  readonly seed: number;
}

/** Erdős–Rényi G(n, p), deterministic for a given seed. */
export const randomGraph = (count: number, options: RandomGraphOptions): Graph =>
  assemble(count, randomPairs(count, options.probability, options.seed), options);

export const wheelGraph = (count: number, options: GeneratorOptions = {}): Graph =>
  assemble(count, wheelPairs(count), options);

export const completeBipartiteGraph = (
  left: number,
  right: number,
  options: GeneratorOptions = {},
): Graph => assemble(left + right, completeBipartitePairs(left, right), options);

/** Binary tree in heap order: vertex `i` has children `2i + 1` and `2i + 2`. */
export const binaryTreeGraph = (count: number, options: GeneratorOptions = {}): Graph =>
  assemble(count, binaryTreePairs(count), options);

/** Hypercube Q_d with 2^d vertices. */
export const hypercubeGraph = (dimension: number, options: GeneratorOptions = {}): Graph =>
  assemble(2 ** dimension, hypercubePairs(dimension), options);

const PETERSEN_ORDER = 10;

/** The Petersen graph (10 vertices, 15 edges, 3-regular). */
export const petersenGraph = (options: GeneratorOptions = {}): Graph =>
  assemble(PETERSEN_ORDER, petersenPairs(), options);

export interface FixedSizeGraphOptions extends GeneratorOptions {
  readonly edges: number;
  readonly seed: number;
}

/** Erdős–Rényi G(n, m): exactly `edges` distinct edges (capped at n(n-1)/2), seeded. */
export const randomGraphWithEdges = (count: number, options: FixedSizeGraphOptions): Graph =>
  assemble(count, fixedSizePairs(count, options.edges, options.seed), options);

export interface PreferentialOptions extends GeneratorOptions {
  /** Edges added per new vertex (≥ 1). */
  readonly attach: number;
  readonly seed: number;
}

/** Barabási–Albert scale-free graph, seeded. */
export const barabasiAlbertGraph = (count: number, options: PreferentialOptions): Graph =>
  assemble(count, preferentialPairs(count, options.attach, options.seed), options);

export interface SmallWorldOptions extends GeneratorOptions {
  /** Lattice degree (even); each vertex starts linked to `neighbors / 2` successors. */
  readonly neighbors: number;
  /** Rewiring probability in [0, 1]. */
  readonly beta: number;
  readonly seed: number;
}

/** Watts–Strogatz small-world graph, seeded. */
export const wattsStrogatzGraph = (count: number, options: SmallWorldOptions): Graph =>
  assemble(count, smallWorldPairs(count, options), options);
