import { GraphBuilder, type Graph } from '@graph-sdk/core';
import { randomGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  aStar,
  bellmanFord,
  dagShortestPaths,
  dijkstra,
  eulerianTrail,
  floydWarshall,
  hamiltonianCycle,
  hamiltonianPath,
  johnson,
  kShortestPaths,
} from './index.js';

const r = (value: number): number => Math.round(value * 1e5) / 1e5 + 0;

function reweighted(
  graph: Graph,
  directed: boolean,
  keep: (from: number, to: number) => boolean,
): Graph {
  const builder = new GraphBuilder({ directed });

  for (const id of graph.vertices()) {
    builder.addVertex(id);
  }

  for (const [index, edge] of graph.edges().entries()) {
    const [from, to] = [Number(edge.source), Number(edge.target)];

    if (keep(from, to)) {
      builder.addEdge(edge.source, edge.target, 1 + ((index * 7 + from) % 5));
    }
  }

  return builder.build();
}

const pair = (found: { distance: number; path: readonly string[] }) => [
  r(found.distance),
  found.path.join('>'),
];

const buildCases = () => {
  const base = randomGraph(10, { probability: 0.35, seed: 21 });
  const undirected = reweighted(base, false, () => true);
  const directed = reweighted(base, true, () => true);
  const dag = reweighted(base, true, (from, to) => from < to);
  const ids = base.vertices();
  const first = ids[0]!;
  const last = ids.at(-1)!;
  const small = randomGraph(7, { probability: 0.6, seed: 22 });

  return {
    dijkstraU: ids.map((id) => r(dijkstra(undirected, first).distanceTo(id))),
    dijkstraPath: ids.map((id) => dijkstra(directed, first).pathTo(id)?.join('>') ?? null),
    bellman: ids.map((id) => r(bellmanFord(directed, first).distanceTo(id))),
    dag: ids.map((id) => r(dagShortestPaths(dag, first).distanceTo(id))),
    dagPath: ids.map((id) => dagShortestPaths(dag, first).pathTo(id)?.join('>') ?? null),
    floyd: ids.map((from) => ids.map((to) => r(floydWarshall(directed).distance(from, to)))),
    johnson: ids.map((from) => ids.map((to) => r(johnson(undirected).distance(from, to)))),
    kShortest: kShortestPaths(undirected, { source: first, target: last, count: 6 }).map((found) =>
      pair(found),
    ),
    kShortestDirected: kShortestPaths(directed, { source: first, target: last, count: 4 }).map(
      (found) => pair(found),
    ),
    aStar: [aStar(undirected, { source: first, target: last, heuristic: () => 0 })].map((found) =>
      found ? pair(found) : null,
    ),
    euler: [eulerianTrail(small), eulerianTrail(randomGraph(6, { probability: 0.9, seed: 3 }))],
    hamPath: [hamiltonianPath(small), hamiltonianPath(base)],
    hamCycle: [
      hamiltonianCycle(small),
      hamiltonianCycle(randomGraph(8, { probability: 0.7, seed: 4 })),
    ],
  };
};

describe('pinned results', () => {
  it('keeps the seeded results of the path kernels', () => {
    expect(buildCases()).toEqual({});
  });
});
