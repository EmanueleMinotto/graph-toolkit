import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { randomGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  boruvkaMinimumSpanningForest,
  minimumSpanningArborescence,
  minimumSpanningForest,
  primMinimumSpanningForest,
  pruferCode,
  RootedTree,
  steinerTree,
  treeFromPruferCode,
} from './index.js';

const seeds = [301, 302, 303, 304, 305, 306, 307];

interface Spec {
  readonly count: number;
  readonly probability: number;
  readonly directed: boolean;
}

function build(seed: number, { count, probability, directed }: Spec): Graph {
  const base = randomGraph(count, { probability, seed });
  const builder = new GraphBuilder({ directed });

  for (const id of base.vertices()) {
    builder.addVertex(id);
  }

  for (const [index, edge] of base.edges().entries()) {
    builder.addEdge(edge.source, edge.target, 1 + ((index * 3 + Number(edge.target) * 2) % 7));
  }

  return builder.build();
}

const listed = (edges: readonly { source: string; target: string; weight: number }[]): string[] =>
  edges.map((edge) => `${edge.source}-${edge.target}:${edge.weight}`);

const forestCases = () =>
  seeds.map((seed) => {
    const graph = build(seed, { count: 14, probability: 0.3, directed: false });

    return [
      listed(minimumSpanningForest(graph).edges),
      minimumSpanningForest(graph).totalWeight,
      listed(primMinimumSpanningForest(graph).edges),
      listed(boruvkaMinimumSpanningForest(graph).edges),
    ];
  });

const arborescenceCases = () =>
  seeds.map((seed) => {
    const graph = build(seed, { count: 12, probability: 0.5, directed: true });
    const found = minimumSpanningArborescence(graph, graph.vertices()[0]!);

    return found === undefined ? 'none' : [found.totalWeight, listed(found.edges)];
  });

const steinerCases = () =>
  seeds.map((seed) => {
    const graph = build(seed, { count: 14, probability: 0.3, directed: false });
    const ids = graph.vertices();
    const found = steinerTree(graph, [ids[1]!, ids[5]!, ids[9]!, ids[12]!]);

    return found === undefined ? 'none' : [found.totalWeight, listed(found.edges)];
  });

const treeCases = () =>
  seeds.map((seed) => {
    const ids = Array.from({ length: 16 }, (_, index) => vertexId(String(index)));
    const code = Array.from(
      { length: 14 },
      (_, index) => ids[(seed * (index + 3) + index * 7) % 16]!,
    );
    const tree = treeFromPruferCode(ids, code);
    const rooted = new RootedTree(tree, ids[seed % 16]!);

    return [
      pruferCode(tree),
      ids.map((id) => rooted.depthOf(id)),
      ids.map((id) => rooted.parentOf(id) ?? 'root'),
      [
        [1, 14],
        [3, 9],
        [15, 2],
        [7, 7],
        [0, 12],
        [5, 11],
      ].map(([left, right]) => rooted.lowestCommonAncestor(ids[left!]!, ids[right!]!)),
    ];
  });

describe('pinned results', () => {
  it('keeps the seeded results', () => {
    expect({
      forests: forestCases(),
      arborescences: arborescenceCases(),
      steiner: steinerCases(),
      trees: treeCases(),
    }).toEqual({});
  });
});
