import { GraphBuilder, vertexId, type Graph, type VertexId } from '@graph-sdk/core';
import fc from 'fast-check';

export interface GraphOptions {
  readonly directed?: boolean;
  /** Edge weights in 1..9 instead of the default weight. */
  readonly weighted?: boolean;
  /** Vertex count is drawn from 0..maxN. Default 8. */
  readonly maxN?: number;
  /** Several edges between the same endpoints. Default false. */
  readonly allowParallelEdges?: boolean;
  /** Edges from a vertex to itself. Default false. */
  readonly allowSelfLoops?: boolean;
}

export type Pair = readonly [number, number];
export type WeightedPair = readonly [number, number, number];

const DEFAULT_MAX_N = 8;
const MAX_WEIGHT = 9;
const MAX_COPIES = 2;

/** Vertices are named "0".."n-1". */
export const name = (index: number): VertexId => vertexId(String(index));

export const range = (n: number): number[] => Array.from({ length: n }, (_, index) => index);

/** Builds a graph on vertices "0".."n-1" through `GraphBuilder`. */
export function buildGraph(
  n: number,
  edges: readonly WeightedPair[],
  options: GraphOptions = {},
): Graph {
  const builder = new GraphBuilder({
    directed: options.directed ?? false,
    allowParallelEdges: options.allowParallelEdges ?? false,
  });

  for (const index of range(n)) {
    builder.addVertex(name(index));
  }

  for (const [from, to, weight] of edges) {
    builder.addEdge(name(from), name(to), weight);
  }

  return builder.build();
}

export const arbWeight = (options: GraphOptions): fc.Arbitrary<number> =>
  options.weighted === true ? fc.integer({ min: 1, max: MAX_WEIGHT }) : fc.constant(1);

/** Every endpoint pair the builder accepts once on `n` vertices. */
export function candidatePairs(n: number, options: GraphOptions = {}): Pair[] {
  const loops = options.allowSelfLoops === true;
  const pairs = range(n).flatMap((from) => range(n).map((to): Pair => [from, to]));

  return pairs.filter(
    ([from, to]) => (options.directed === true || from <= to) && (loops || from !== to),
  );
}

/** A subset of `pairs`, each kept once (or a few times when parallel edges are allowed), weighted. */
export function arbEdgesAmong(
  pairs: readonly Pair[],
  options: GraphOptions = {},
): fc.Arbitrary<WeightedPair[]> {
  const copies = options.allowParallelEdges === true ? MAX_COPIES : 1;
  const weights = fc.array(arbWeight(options), { minLength: 1, maxLength: copies });

  return fc
    .subarray([...pairs])
    .chain((chosen) =>
      fc.tuple(
        ...chosen.map(([from, to]) =>
          weights.map((list) => list.map((weight): WeightedPair => [from, to, weight])),
        ),
      ),
    )
    .map((groups) => groups.flat());
}

/** Small random graph (0 to `maxN` vertices) built through `GraphBuilder`. */
export function arbGraph(options: GraphOptions = {}): fc.Arbitrary<Graph> {
  return fc
    .integer({ min: 0, max: options.maxN ?? DEFAULT_MAX_N })
    .chain((n) =>
      arbEdgesAmong(candidatePairs(n, options), options).map((edges) =>
        buildGraph(n, edges, options),
      ),
    );
}
