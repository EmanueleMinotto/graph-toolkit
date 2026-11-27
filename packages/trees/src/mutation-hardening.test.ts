import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { pathGraph, starGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  boruvkaMinimumSpanningForest,
  isTree,
  minimumSpanningArborescence,
  minimumSpanningForest,
  primMinimumSpanningForest,
  pruferCode,
  RootedTree,
  steinerTree,
  treeFromPruferCode,
} from './index.js';

const name = (index: number) => vertexId(String(index));

const build = (
  count: number,
  arcs: readonly (readonly [number, number, number])[],
  directed = false,
): Graph => {
  const builder = new GraphBuilder({ directed });

  for (let index = 0; index < count; index++) {
    builder.addVertex(name(index));
  }

  for (const [from, to, weight] of arcs) {
    builder.addEdge(name(from), name(to), weight);
  }

  return builder.build();
};

describe('error messages', () => {
  const directed = pathGraph(3, { directed: true });

  it('words every refusal', () => {
    expect(() => minimumSpanningForest(directed)).toThrow(
      'minimumSpanningForest requires an undirected graph',
    );

    expect(() => primMinimumSpanningForest(directed)).toThrow(
      'primMinimumSpanningForest requires an undirected graph',
    );

    expect(() => boruvkaMinimumSpanningForest(directed)).toThrow(
      'boruvkaMinimumSpanningForest requires an undirected graph',
    );

    expect(() => steinerTree(directed, [name(0)])).toThrow(
      'steinerTree requires an undirected graph',
    );

    expect(() => minimumSpanningArborescence(pathGraph(3), name(0))).toThrow(
      'minimumSpanningArborescence requires a directed graph',
    );

    expect(() => pruferCode(directed)).toThrow('pruferCode requires an undirected tree');

    expect(() => new RootedTree(directed, name(0))).toThrow(
      'RootedTree requires an undirected tree',
    );

    expect(() => steinerTree(build(2, [[0, 1, -1]]), [name(0), name(1)])).toThrow(
      'weights must be non-negative',
    );
  });

  it('rejects a Prüfer code that does not fit the vertices', () => {
    const [a, b, c, d] = [name(0), name(1), name(2), name(3)];
    const message = 'code must have vertices.length - 2 entries, all from vertices';

    expect(() => treeFromPruferCode([a, b, c, d], [a])).toThrow(message);
    expect(() => treeFromPruferCode([a, b, c], [vertexId('zzz')])).toThrow(message);
    expect(() => treeFromPruferCode([a, b, c], [])).toThrow(message);
    expect(treeFromPruferCode([a, b, c], [b]).edgeCount).toBe(2);
  });
});

describe('boundaries', () => {
  it('does not take the empty graph for a tree', () => {
    expect(isTree(new GraphBuilder().build())).toBe(false);
  });

  it('accepts zero weights, but not a single negative one among positives', () => {
    expect(steinerTree(build(2, [[0, 1, 0]]), [name(0), name(1)])?.totalWeight).toBe(0);

    expect(() =>
      steinerTree(
        build(3, [
          [0, 1, 1],
          [1, 2, -1],
        ]),
        [name(0), name(2)],
      ),
    ).toThrow('weights must be non-negative');
  });

  it('keeps every edge of a star Steiner tree', () => {
    const tree = steinerTree(starGraph(4), [name(1), name(2), name(3)]);

    expect(tree?.edges).toHaveLength(3);
    expect(tree?.totalWeight).toBe(3);
  });
});

const cycle = (entry: number) =>
  build(
    4,
    [
      [0, 1, 5],
      [1, 2, 1],
      [2, 3, 1],
      [3, 1, 1],
      [0, 2, entry],
    ],
    true,
  );

const arcsOf = (graph: Graph) =>
  minimumSpanningArborescence(graph, name(0))
    ?.edges.map((edge) => `${edge.source}>${edge.target}`)
    .toSorted((left, right) => left.localeCompare(right));

describe('minimum arborescence with cycles', () => {
  it('breaks a cycle through the cheaper entry point', () => {
    const expensive = minimumSpanningArborescence(cycle(6), name(0));
    const cheap = minimumSpanningArborescence(cycle(2), name(0));

    expect(expensive?.totalWeight).toBe(7);
    expect(arcsOf(cycle(6))).toEqual(['0>1', '1>2', '2>3']);
    expect(cheap?.totalWeight).toBe(4);
    expect(arcsOf(cycle(2))).toEqual(['0>2', '2>3', '3>1']);
  });

  it('ignores self-loops and returns undefined for unreachable vertices', () => {
    const loop = build(
      2,
      [
        [0, 0, 0],
        [0, 1, 3],
      ],
      true,
    );

    expect(minimumSpanningArborescence(loop, name(0))?.totalWeight).toBe(3);
    expect(minimumSpanningArborescence(build(3, [[0, 1, 1]], true), name(0))).toBeUndefined();
  });
});
