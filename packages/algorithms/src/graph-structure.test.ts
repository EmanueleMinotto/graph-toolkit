import { GraphBuilder, GraphError, vertexId, type Graph } from '@graph-toolkit/core';
import { completeGraph, cycleGraph, pathGraph, starGraph } from '@graph-toolkit/generators';
import { describe, expect, it } from 'vitest';
import {
  articulationPoints,
  averageClustering,
  biconnectedComponents,
  bridges,
  center,
  clusteringCoefficients,
  diameter,
  eccentricities,
  kCores,
  maxFlow,
  minCut,
  radius,
  transitiveClosure,
} from './index.js';

const v = (index: number) => vertexId(String(index));

/** Two triangles {0,1,2} and {2,3,4} sharing vertex 2, plus a pendant 4-5. */
function bowtie(): Graph {
  const builder = new GraphBuilder({ directed: false });
  for (let index = 0; index < 6; index++) builder.addVertex(v(index));
  for (const [from, to] of [
    [0, 1],
    [1, 2],
    [0, 2],
    [2, 3],
    [3, 4],
    [2, 4],
    [4, 5],
  ] as const) {
    builder.addEdge(v(from), v(to));
  }
  return builder.build();
}

describe('connectivity structure', () => {
  it('finds articulation points, bridges and blocks', () => {
    const graph = bowtie();
    expect(articulationPoints(graph).toSorted((a, b) => a.localeCompare(b))).toEqual([v(2), v(4)]);
    expect(bridges(graph)).toEqual([[v(4), v(5)]]);
    expect(biconnectedComponents(graph)).toHaveLength(3);
  });

  it('finds no cut structure in a cycle and all edges of a path', () => {
    expect(articulationPoints(cycleGraph(5))).toEqual([]);
    expect(bridges(cycleGraph(5))).toEqual([]);
    expect(bridges(pathGraph(4))).toHaveLength(3);
    expect(articulationPoints(starGraph(5))).toEqual([v(0)]);
  });

  it('rejects directed graphs', () => {
    const directed = completeGraph(3, { directed: true });
    expect(() => bridges(directed)).toThrow(GraphError);
    expect(() => articulationPoints(directed)).toThrow(GraphError);
  });
});

describe('cores and clustering', () => {
  it('computes core numbers', () => {
    const cores = kCores(bowtie());
    expect(cores.get(v(0))).toBe(2);
    expect(cores.get(v(5))).toBe(1);
    expect(kCores(completeGraph(4)).get(v(0))).toBe(3);
  });

  it('computes clustering coefficients', () => {
    expect(clusteringCoefficients(completeGraph(4)).get(v(0))).toBe(1);
    expect(clusteringCoefficients(starGraph(4)).get(v(0))).toBe(0);
    expect(averageClustering(completeGraph(4))).toBe(1);
    expect(averageClustering(pathGraph(0))).toBe(0);
  });

  it('ignores self-loops in clustering', () => {
    const builder = new GraphBuilder({ directed: false });
    builder.addVertex(v(0)).addVertex(v(1)).addEdge(v(0), v(0)).addEdge(v(0), v(1));
    expect(clusteringCoefficients(builder.build()).get(v(0))).toBe(0);
  });
});

describe('distance measures', () => {
  it('computes eccentricity, diameter, radius and center of a path', () => {
    const path = pathGraph(5);
    expect(eccentricities(path).get(v(0))).toBe(4);
    expect(diameter(path)).toBe(4);
    expect(radius(path)).toBe(2);
    expect(center(path)).toEqual([v(2)]);
  });

  it('reports Infinity for disconnected graphs and 0 for empty ones', () => {
    const builder = new GraphBuilder({ directed: false });
    builder.addVertex(v(0)).addVertex(v(1));
    expect(diameter(builder.build())).toBe(Infinity);
    expect(diameter(pathGraph(0))).toBe(0);
    expect(radius(pathGraph(0))).toBe(0);
  });
});

describe('transitiveClosure', () => {
  it('links every vertex to everything reachable from it', () => {
    const chain = pathGraph(4, { directed: true });
    const closure = transitiveClosure(chain);
    expect(closure.edgeCount).toBe(6);
    expect(closure.hasEdge(v(0), v(3))).toBe(true);
    expect(closure.hasEdge(v(3), v(0))).toBe(false);
  });
});

describe('minCut', () => {
  it('finds the bottleneck edges and their total capacity', () => {
    const builder = new GraphBuilder({ directed: true });
    for (let index = 0; index < 4; index++) builder.addVertex(v(index));
    builder.addEdge(v(0), v(1), 10).addEdge(v(0), v(2), 10);
    builder.addEdge(v(1), v(3), 4).addEdge(v(2), v(3), 5).addEdge(v(1), v(2), 2);
    const cut = minCut(builder.build(), v(0), v(3));
    expect(cut.value).toBe(maxFlow(builder.build(), v(0), v(3)));
    expect(cut.sourceSide).toContain(v(0));
    expect(cut.sinkSide).toContain(v(3));
    expect(cut.edges.reduce((sum, edge) => sum + edge.weight, 0)).toBe(cut.value);
  });
});
