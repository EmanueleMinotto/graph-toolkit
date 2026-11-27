import { GraphBuilder, type Graph } from '@graph-sdk/core';
import fc from 'fast-check';
import {
  arbEdgesAmong,
  arbWeight,
  buildGraph,
  candidatePairs,
  name,
  range,
  type GraphOptions,
  type Pair,
  type WeightedPair,
} from './arbitraries.js';

const DEFAULT_MAX_N = 8;

/** A uniformly shuffled arrangement of 0..n-1. */
export const arbPermutation = (n: number): fc.Arbitrary<number[]> =>
  fc.shuffledSubarray(range(n), { minLength: n, maxLength: n });

/** Parent of vertex `index + 1` is drawn from 0..index, so the pairs form a rooted tree on 0..n-1. */
const arbTreeEdges = (n: number, options: GraphOptions): fc.Arbitrary<WeightedPair[]> =>
  fc.tuple(
    ...range(Math.max(n - 1, 0)).map((index) =>
      fc.tuple(fc.integer({ min: 0, max: index }), fc.constant(index + 1), arbWeight(options)),
    ),
  );

const sizeIn = (min: number, options: GraphOptions): fc.Arbitrary<number> =>
  fc.integer({ min, max: options.maxN ?? DEFAULT_MAX_N });

const mapped = (edges: readonly WeightedPair[], to: readonly number[]): WeightedPair[] =>
  edges.map(([from, target, weight]) => [to[from] ?? from, to[target] ?? target, weight]);

/** Connected graph (weakly, when directed) with 1..`maxN` vertices: a random tree plus extra edges. */
export function arbConnectedGraph(options: GraphOptions = {}): fc.Arbitrary<Graph> {
  return sizeIn(1, options).chain((n) =>
    arbTreeEdges(n, options).chain((tree) => {
      const used = new Set(tree.map(([from, to]) => `${String(from)}:${String(to)}`));
      const free = candidatePairs(n, options).filter(
        ([from, to]: Pair) => !used.has(`${String(from)}:${String(to)}`),
      );

      return arbEdgesAmong(free, options).map((extra) =>
        buildGraph(n, [...tree, ...extra], options),
      );
    }),
  );
}

/** Directed acyclic graph with 0..`maxN` vertices, ids shuffled so they do not follow topological order. */
export function arbDag(
  options: Omit<GraphOptions, 'directed' | 'allowSelfLoops'> = {},
): fc.Arbitrary<Graph> {
  const dag = { ...options, directed: true };

  return sizeIn(0, options).chain((n) =>
    fc
      .tuple(
        arbEdgesAmong(
          candidatePairs(n, dag).filter(([from, to]) => from < to),
          dag,
        ),
        arbPermutation(n),
      )
      .map(([edges, order]) => buildGraph(n, mapped(edges, order), dag)),
  );
}

/** Undirected tree with 1..`maxN` vertices and shuffled ids. */
export function arbTree(
  options: Pick<GraphOptions, 'maxN' | 'weighted'> = {},
): fc.Arbitrary<Graph> {
  return sizeIn(1, options).chain((n) =>
    fc
      .tuple(arbTreeEdges(n, options), arbPermutation(n))
      .map(([edges, order]) => buildGraph(n, mapped(edges, order))),
  );
}

/** The same graph with vertex "k" renamed "permutation[k]" and every vertex/edge re-inserted in that order. */
export function relabel(graph: Graph, permutation: readonly number[]): Graph {
  const rename = (id: string): ReturnType<typeof name> =>
    name(permutation[Number(id)] ?? Number(id));
  const builder = new GraphBuilder({ directed: graph.directed, allowParallelEdges: true });

  for (const id of graph.vertices()) {
    builder.addVertex(rename(id), graph.vertexAttributes(id));
  }

  for (const { source, target, weight } of graph.edges()) {
    builder.addEdge(rename(source), rename(target), weight);
  }

  return builder.build();
}
