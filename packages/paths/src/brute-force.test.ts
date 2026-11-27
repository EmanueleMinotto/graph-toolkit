import { GraphBuilder, type Graph, type VertexId } from '@graph-sdk/core';
import { randomGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import { aStar, dijkstra, kShortestPaths } from './index.js';

interface Route {
  readonly cost: number;
  readonly path: readonly VertexId[];
}

interface Ends {
  readonly from: VertexId;
  readonly to: VertexId;
  readonly seen: readonly VertexId[];
}

function weighted(seed: number, directed: boolean): Graph {
  const base = randomGraph(8, { probability: 0.45, seed });
  const builder = new GraphBuilder({ directed });

  for (const id of base.vertices()) {
    builder.addVertex(id);
  }

  for (const [index, edge] of base.edges().entries()) {
    builder.addEdge(edge.source, edge.target, 1 + ((index * 5 + Number(edge.target)) % 6));
  }

  return builder.build();
}

/** Every loopless route between two vertices, by depth-first search. */
function routes(graph: Graph, { from, to, seen }: Ends): Route[] {
  const here = [...seen, from];

  if (from === to) {
    return [{ cost: 0, path: here }];
  }

  return graph
    .neighbors(from)
    .filter((edge) => !here.includes(edge.target))
    .flatMap((edge) =>
      routes(graph, { from: edge.target, to, seen: here }).map((rest) => ({
        cost: rest.cost + edge.weight,
        path: rest.path,
      })),
    );
}

const costOf = (graph: Graph, path: readonly VertexId[]): number =>
  path
    .slice(1)
    .reduce((sum, next, index) => sum + graph.edgesBetween(path[index]!, next)[0]!.weight, 0);

const seeds = Array.from({ length: 14 }, (_, index) => 400 + index);
const graphs = (directed: boolean): Graph[] => seeds.map((seed) => weighted(seed, directed));
const endsOf = (graph: Graph) => ({ source: graph.vertices()[0]!, target: graph.vertices()[7]! });

function yenReport(graph: Graph) {
  const { source, target } = endsOf(graph);
  const all = routes(graph, { from: source, to: target, seen: [] });
  const found = kShortestPaths(graph, { source, target, count: 9 });

  return {
    got: found.map((route) => route.distance),
    want: all
      .map((route) => route.cost)
      .toSorted((left, right) => left - right)
      .slice(0, 9),
    unique: new Set(found.map((route) => route.path.join('>'))).size === found.length,
    simple: found.every((route) => new Set(route.path).size === route.path.length),
    honest: found.every((route) => costOf(graph, route.path) === route.distance),
  };
}

function aStarReport(graph: Graph, scale: number) {
  const { source, target } = endsOf(graph);
  const toTarget = dijkstra(graph, target);
  const found = aStar(graph, {
    source,
    target,
    heuristic: (vertex) => toTarget.distanceTo(vertex) * scale,
  });

  const distance = found?.distance ?? Infinity;

  return {
    got: distance,
    want: dijkstra(graph, source).distanceTo(target),
    honest: costOf(graph, found?.path ?? []) === (found === undefined ? 0 : distance),
  };
}

describe('Yen against exhaustive enumeration', () => {
  it.each([false, true])('returns the cheapest loopless routes (directed: %s)', (directed) => {
    for (const graph of graphs(directed)) {
      const report = yenReport(graph);

      expect(report.got).toEqual(report.want);
      expect([report.unique, report.simple, report.honest]).toEqual([true, true, true]);
    }
  });
});

describe('A* with an informative heuristic', () => {
  it.each([1, 0.5])('matches Dijkstra with the remaining distance scaled by %s', (scale) => {
    for (const graph of graphs(false)) {
      const report = aStarReport(graph, scale);

      expect(report.got).toBe(report.want);
      expect(report.honest).toBe(true);
    }
  });
});
