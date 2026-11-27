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
    expect(buildCases()).toEqual({
      aStar: [[6, '0>8>5>6>9']],
      bellman: [0, null, 1, 3, 5, 8, 10, 12, 2, 8],
      dag: [0, null, 1, 3, 5, 8, 10, 12, 2, 8],
      dagPath: ['0', null, '0>2', '0>3', '0>4', '0>4>5', '0>4>6', '0>4>5>7', '0>8', '0>3>9'],
      dijkstraPath: ['0', null, '0>2', '0>3', '0>4', '0>4>5', '0>4>6', '0>4>5>7', '0>8', '0>3>9'],
      dijkstraU: [0, 8, 1, 3, 4, 3, 5, 7, 2, 6],
      euler: [
        ['0', '6', '5', '4', '6', '3', '5', '1', '6', '2', '4', '3', '2', '1', '3', '0', '2'],
        null,
      ],
      floyd: [
        [0, null, 1, 3, 5, 8, 10, 12, 2, 8],
        [null, 0, null, 5, null, null, null, 2, 8, 10],
        [null, null, 0, null, 5, 8, 10, 12, 7, 9],
        [null, null, null, 0, null, null, null, null, 3, 5],
        [null, null, null, null, 0, 3, 5, 7, 2, 4],
        [null, null, null, null, null, 0, 2, 4, 1, 3],
        [null, null, null, null, null, null, 0, 4, null, 1],
        [null, null, null, null, null, null, null, 0, null, null],
        [null, null, null, null, null, null, null, null, 0, null],
        [null, null, null, null, null, null, null, null, null, 0],
      ],
      hamCycle: [
        ['0', '2', '3', '4', '5', '1', '6'],
        ['0', '3', '5', '7', '1', '2', '6', '4'],
      ],
      hamPath: [
        ['0', '2', '3', '4', '5', '6', '1'],
        ['0', '2', '4', '5', '8', '3', '9', '6', '7', '1'],
      ],
      johnson: [
        [0, 8, 1, 3, 4, 3, 5, 7, 2, 6],
        [8, 0, 9, 5, 9, 6, 6, 2, 7, 7],
        [1, 9, 0, 4, 5, 4, 6, 8, 3, 7],
        [3, 5, 4, 0, 5, 4, 6, 7, 3, 5],
        [4, 9, 5, 5, 0, 3, 5, 7, 2, 4],
        [3, 6, 4, 4, 3, 0, 2, 4, 1, 3],
        [5, 6, 6, 6, 5, 2, 0, 4, 3, 1],
        [7, 2, 8, 7, 7, 4, 4, 0, 5, 5],
        [2, 7, 3, 3, 2, 1, 3, 5, 0, 4],
        [6, 7, 7, 5, 4, 3, 1, 5, 4, 0],
      ],
      kShortest: [
        [6, '0>8>5>6>9'],
        [8, '0>3>9'],
        [8, '0>8>4>9'],
        [9, '0>4>9'],
        [10, '0>8>5>4>9'],
        [10, '0>3>8>5>6>9'],
      ],
      kShortestDirected: [
        [8, '0>3>9'],
        [9, '0>4>9'],
        [10, '0>2>4>9'],
        [11, '0>4>6>9'],
      ],
    });
  });
});
