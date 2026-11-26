import { GraphBuilder, GraphError, vertexId, type Graph, type VertexId } from '@graph-sdk/core';
import { completeGraph, pathGraph, randomGraph } from '@graph-sdk/generators';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { leiden, louvain } from './index.js';

const name = (index: number) => vertexId(String(index));

type Arc = readonly [number, number, number?];

const build = (count: number, arcs: readonly Arc[], directed = false): Graph => {
  const builder = new GraphBuilder({ directed, allowParallelEdges: true });

  for (let index = 0; index < count; index++) {
    builder.addVertex(name(index));
  }

  for (const [from, to, weight = 1] of arcs) {
    builder.addEdge(name(from), name(to), weight);
  }

  return builder.build();
};

const clique = (first: number, size: number): Arc[] =>
  Array.from({ length: size * size }, (_, pair): Arc => [
    first + Math.floor(pair / size),
    first + (pair % size),
  ]).filter(([from, to]) => from < to);

const total = (values: Iterable<number>): number => [...values].reduce((sum, v) => sum + v, 0);

/** Newman modularity of a partition of an undirected graph. */
const modularity = (graph: Graph, groups: ReadonlyMap<VertexId, number>): number => {
  const edges = graph.edges();
  const twice = 2 * total(edges.map((edge) => edge.weight));
  const degree = new Map<number, number>();

  for (const { source, target, weight } of edges) {
    for (const group of [groups.get(source)!, groups.get(target)!]) {
      degree.set(group, (degree.get(group) ?? 0) + weight);
    }
  }

  const inside = total(
    edges.map((edge) =>
      groups.get(edge.source) === groups.get(edge.target) ? 2 * edge.weight : 0,
    ),
  );
  const expected = total([...degree.values()].map((value) => value * value));

  return twice === 0 ? 0 : inside / twice - expected / (twice * twice);
};

const countOf = (groups: ReadonlyMap<VertexId, number>): number => new Set(groups.values()).size;

describe.each([
  ['louvain', louvain],
  ['leiden', leiden],
])('%s', (_name, detect) => {
  it('separates two triangles joined by a bridge', () => {
    const graph = build(6, [...clique(0, 3), ...clique(3, 3), [2, 3]]);
    const groups = detect(graph);

    expect([...groups.values()]).toEqual([0, 0, 0, 1, 1, 1]);
  });

  it('aggregates a ring of cliques into one community per clique', () => {
    const size = 5;
    const arcs = Array.from({ length: 4 }, (_, index): Arc[] => [
      ...clique(index * size, size),
      [index * size, ((index + 1) % 4) * size + 1],
    ]).flat();
    const groups = detect(build(4 * size, arcs));

    expect(countOf(groups)).toBe(4);
    expect(groups.get(name(0))).toBe(groups.get(name(4)));
    expect(groups.get(name(0))).not.toBe(groups.get(name(5)));
  });

  it('honors edge weights', () => {
    const groups = detect(
      build(4, [
        [0, 1, 10],
        [1, 2, 1],
        [2, 3, 10],
      ]),
    );

    expect([...groups.values()]).toEqual([0, 0, 1, 1]);
  });

  it('merges or splits communities as the resolution moves', () => {
    const graph = build(6, [...clique(0, 3), ...clique(3, 3), [2, 3]]);

    expect(countOf(detect(graph, { resolution: 0.01 }))).toBe(1);
    expect(countOf(detect(graph, { resolution: 50 }))).toBe(6);
  });

  it('ignores direction, keeps loops in the degrees and handles graphs without edges', () => {
    const directed = build(
      4,
      [
        [0, 1],
        [1, 0],
        [2, 3],
        [3, 3],
        [1, 2],
      ],
      true,
    );

    expect(countOf(detect(directed))).toBe(2);
    expect(countOf(detect(build(3, [])))).toBe(3);
    expect(detect(build(0, [])).size).toBe(0);
  });

  it('respects the sweep cap', () => {
    const graph = build(6, [...clique(0, 3), ...clique(3, 3), [2, 3]]);

    expect(countOf(detect(graph, { maxIterations: 0 }))).toBe(6);
    expect(countOf(detect(graph, { maxIterations: 1 }))).toBeLessThanOrEqual(2);
  });

  it('never does worse than singletons and always returns connected communities', () => {
    fc.assert(
      fc.property(fc.integer({ min: 2, max: 25 }), fc.integer(), (count, seed) => {
        const graph = randomGraph(count, { probability: 0.15, seed });
        const groups = detect(graph);
        const singletons = new Map(graph.vertices().map((id, index) => [id, index]));

        expect(detect(graph)).toEqual(groups);

        expect(modularity(graph, groups)).toBeGreaterThanOrEqual(
          modularity(graph, singletons) - 1e-9,
        );

        expect(isConnectedPerGroup(graph, groups)).toBe(true);
      }),
    );
  });

  it('beats one big community on a path and on a complete graph stays whole', () => {
    expect(countOf(detect(pathGraph(12)))).toBeGreaterThan(1);
    expect(countOf(detect(completeGraph(6)))).toBe(1);
  });

  it('validates options and weights', () => {
    const graph = pathGraph(3);

    expect(() => detect(graph, { resolution: 0 })).toThrow(GraphError);
    expect(() => detect(graph, { resolution: Infinity })).toThrow(GraphError);
    expect(() => detect(build(2, [[0, 1, -1]]))).toThrow(GraphError);
  });
});

function isConnectedPerGroup(graph: Graph, groups: ReadonlyMap<VertexId, number>): boolean {
  return [...new Set(groups.values())].every((group) => {
    const members = graph.vertices().filter((id) => groups.get(id) === group);
    const seen = new Set<VertexId>([members[0]!]);
    let before = 0;

    while (seen.size !== before) {
      before = seen.size;

      const next = [...seen]
        .flatMap((id) => graph.neighbors(id).map((edge) => edge.target))
        .filter((target) => groups.get(target) === group);

      for (const target of next) {
        seen.add(target);
      }
    }

    return seen.size === members.length;
  });
}
