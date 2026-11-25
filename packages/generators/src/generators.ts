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
