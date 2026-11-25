import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  bellmanFord,
  boruvkaMinimumSpanningForest,
  dijkstra,
  floydWarshall,
  fromGml,
  fromGraph6,
  GraphBuilder,
  johnson,
  maximumBipartiteMatching,
  maximumMatching,
  minimumSpanningForest,
  primMinimumSpanningForest,
  randomGraph,
  toGml,
  toGraph6,
  vertexId,
  type Graph,
} from './index.js';

const SIZE = 7;
const name = (index: number) => vertexId(String(index));

const edgeList = fc.array(
  fc.tuple(
    fc.integer({ min: 0, max: SIZE - 1 }),
    fc.integer({ min: 0, max: SIZE - 1 }),
    fc.integer({ min: 1, max: 9 }),
  ),
  { maxLength: 20 },
);

const pairKey = (from: number, to: number, directed: boolean): string =>
  directed
    ? `${String(from)}>${String(to)}`
    : `${String(Math.min(from, to))}-${String(Math.max(from, to))}`;

/** Simple weighted graph: later duplicates and self-loops are dropped. */
function weighted(edges: readonly (readonly [number, number, number])[], directed: boolean): Graph {
  const builder = new GraphBuilder({ directed });
  for (let index = 0; index < SIZE; index++) builder.addVertex(name(index));
  const seen = new Set<string>();
  for (const [from, to, weight] of edges) {
    const key = pairKey(from, to, directed);
    if (from === to || seen.has(key)) continue;
    seen.add(key);
    builder.addEdge(name(from), name(to), weight);
  }
  return builder.build();
}

const sortedEdges = (graph: Graph): string[] =>
  graph
    .edges()
    .map((edge) => [edge.source, edge.target].toSorted((a, b) => a.localeCompare(b)).join('-'))
    .toSorted((a, b) => a.localeCompare(b));

describe('properties', () => {
  it('Dijkstra and Bellman-Ford agree on non-negative weights', () => {
    fc.assert(
      fc.property(edgeList, (edges) => {
        const graph = weighted(edges, true);
        const [fast, slow] = [dijkstra(graph, name(0)), bellmanFord(graph, name(0))];
        for (const id of graph.vertices()) expect(fast.distanceTo(id)).toBe(slow.distanceTo(id));
      }),
    );
  });

  it('Johnson and Floyd-Warshall agree', () => {
    fc.assert(
      fc.property(edgeList, (edges) => {
        const graph = weighted(edges, true);
        const [fast, slow] = [johnson(graph), floydWarshall(graph)];
        for (const from of graph.vertices()) {
          for (const to of graph.vertices())
            expect(fast.distance(from, to)).toBe(slow.distance(from, to));
        }
      }),
    );
  });

  it('Kruskal, Prim and Borůvka find equally heavy spanning forests', () => {
    fc.assert(
      fc.property(edgeList, (edges) => {
        const graph = weighted(edges, false);
        const kruskal = minimumSpanningForest(graph).totalWeight;
        expect(primMinimumSpanningForest(graph).totalWeight).toBe(kruskal);
        expect(boruvkaMinimumSpanningForest(graph).totalWeight).toBe(kruskal);
      }),
    );
  });

  it('blossom matching is never smaller than bipartite matching on bipartite graphs', () => {
    fc.assert(
      fc.property(edgeList, (edges) => {
        const bipartite = edges.map(
          ([from, to, weight]) => [from % 3, 3 + (to % 4), weight] as const,
        );
        const graph = weighted(bipartite, false);
        expect(maximumMatching(graph).size).toBe(maximumBipartiteMatching(graph).size);
      }),
    );
  });

  it('graph6 and GML round-trip any simple undirected graph', () => {
    fc.assert(
      fc.property(edgeList, (edges) => {
        const graph = weighted(edges, false);
        expect(sortedEdges(fromGraph6(toGraph6(graph)))).toEqual(sortedEdges(graph));
        expect(sortedEdges(fromGml(toGml(graph)))).toEqual(sortedEdges(graph));
      }),
    );
  });

  it('random graphs are reproducible per seed', () => {
    fc.assert(
      fc.property(fc.integer({ min: 0, max: 1000 }), (seed) => {
        const options = { probability: 0.4, seed };
        expect(randomGraph(9, options).edges()).toEqual(randomGraph(9, options).edges());
      }),
    );
  });
});
