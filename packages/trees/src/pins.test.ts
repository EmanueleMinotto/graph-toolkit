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

const r = (value: number): number => Math.round(value * 1e5) / 1e5 + 0;

function reweighted(graph: Graph, directed: boolean): Graph {
  const builder = new GraphBuilder({ directed });

  for (const id of graph.vertices()) {
    builder.addVertex(id);
  }

  for (const [index, edge] of graph.edges().entries()) {
    builder.addEdge(edge.source, edge.target, 1 + ((index * 5 + Number(edge.source)) % 7));
  }

  return builder.build();
}

const listed = (edges: readonly { source: string; target: string; weight: number }[]) =>
  edges.map((edge) => `${edge.source}-${edge.target}:${edge.weight}`);

const buildCases = () => {
  const base = randomGraph(12, { probability: 0.35, seed: 31 });
  const undirected = reweighted(base, false);
  const ids = base.vertices();
  const kruskal = minimumSpanningForest(undirected);
  const prim = primMinimumSpanningForest(undirected);
  const boruvka = boruvkaMinimumSpanningForest(undirected);
  const arborescences = [41, 42, 43].map((seed) => {
    const directed = reweighted(randomGraph(9, { probability: 0.8, seed }), true);
    const found = minimumSpanningArborescence(directed, directed.vertices()[0]!);

    return found === undefined ? null : [r(found.totalWeight), listed(found.edges)];
  });
  const tree = treeFromPruferCode(
    ids,
    ['3', '3', '7', '1', '1', '9', '4', '4', '0', '5'].map((id) => vertexId(id)),
  );
  const rooted = new RootedTree(tree, ids[0]!);

  return {
    kruskal: [r(kruskal.totalWeight), listed(kruskal.edges)],
    prim: [r(prim.totalWeight), prim.edges.length],
    boruvka: [r(boruvka.totalWeight), boruvka.edges.length],
    arborescences,
    steiner: [
      [ids[1]!, ids[4]!, ids[8]!],
      [ids[2]!, ids[9]!],
    ].map((terminals) => {
      const found = steinerTree(undirected, terminals);

      return found === undefined ? null : [r(found.totalWeight), listed(found.edges)];
    }),
    prufer: pruferCode(tree),
    depths: ids.map((id) => rooted.depthOf(id)),
    parents: ids.map((id) => rooted.parentOf(id) ?? null),
    children: ids.map((id) => rooted.childrenOf(id)),
    lca: [
      [2, 9],
      [4, 11],
      [6, 6],
      [1, 10],
      [5, 8],
    ].map(([left, right]) => rooted.lowestCommonAncestor(ids[left!]!, ids[right!]!)),
  };
};

describe('pinned results', () => {
  it('keeps the seeded results of the tree kernels', () => {
    expect(buildCases()).toEqual({});
  });
});
