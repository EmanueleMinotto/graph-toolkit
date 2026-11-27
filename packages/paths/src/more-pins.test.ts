import { GraphBuilder, type Graph } from '@graph-sdk/core';
import { randomGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  aStar,
  bellmanFord,
  dagShortestPaths,
  eulerianTrail,
  floydWarshall,
  hamiltonianCycle,
  hamiltonianPath,
  johnson,
  kShortestPaths,
} from './index.js';

const seeds = [201, 202, 203, 204, 205, 206];
const text = (value: number): string => String(Math.round(value * 1e5) / 1e5);

function build(seed: number, directed: boolean, negative: boolean): Graph {
  const base = randomGraph(11, { probability: 0.3, seed });
  const builder = new GraphBuilder({ directed });

  for (const id of base.vertices()) {
    builder.addVertex(id);
  }

  for (const [index, edge] of base.edges().entries()) {
    const keep = !negative || Number(edge.source) < Number(edge.target);
    const weight = 1 + ((index * 5 + Number(edge.target)) % 6) - (negative ? 2 : 0);

    if (keep) {
      builder.addEdge(edge.source, edge.target, weight);
    }
  }

  return builder.build();
}

const distances = (
  graph: Graph,
  solve: (graph: Graph) => (from: string, to: string) => number,
): string[] => {
  const distance = solve(graph);

  return graph.vertices().flatMap((from) => graph.vertices().map((to) => text(distance(from, to))));
};

const shortestCases = () =>
  seeds.map((seed) => {
    const dag = build(seed, true, true);
    const ids = dag.vertices();

    return [
      distances(dag, (graph) => {
        const matrix = johnson(graph);

        return (from, to) => matrix.distance(from, to);
      }),
      distances(dag, (graph) => {
        const matrix = floydWarshall(graph);

        return (from, to) => matrix.distance(from, to);
      }),
      ids.map((id) => text(bellmanFord(dag, ids[0]!).distanceTo(id))),
      ids.map((id) => dagShortestPaths(dag, ids[0]!).pathTo(id)?.join('>') ?? 'none'),
    ];
  });

const routeCases = () =>
  seeds.map((seed) => {
    const graph = build(seed, seed % 2 === 0, false);
    const ids = graph.vertices();
    const request = { source: ids[0]!, target: ids.at(-1)!, count: 7 };

    return [
      kShortestPaths(graph, request).map(
        (found) => `${text(found.distance)} ${found.path.join('>')}`,
      ),
      aStar(graph, { ...request, heuristic: () => 0 })?.path.join('>') ?? 'none',
    ];
  });

const trailCases = () =>
  seeds.map((seed) => {
    const graph = randomGraph(8, { probability: 0.55, seed });

    return [eulerianTrail(graph), hamiltonianPath(graph), hamiltonianCycle(graph)].map((found) =>
      found?.join('>'),
    );
  });

describe('pinned results', () => {
  it('keeps the seeded results', () => {
    expect({ shortest: shortestCases(), routes: routeCases(), trails: trailCases() }).toEqual({});
  });
});
