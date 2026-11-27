import { GraphBuilder, vertexId, type Graph } from '@graph-sdk/core';
import { completeGraph, cycleGraph, pathGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  approximateBetweenness,
  articulationPoints,
  biconnectedComponents,
  bridges,
  globalMinCut,
  isPlanar,
  louvain,
  maxFlow,
  maxFlowDinic,
  maximalCliques,
  maximumBipartiteMatching,
  maximumMatching,
  minCostFlow,
  minCut,
  minimumCostAssignment,
  treewidth,
} from './index.js';

const id = (name: string) => vertexId(name);

const build = (
  names: readonly string[],
  arcs: readonly (readonly [string, string, number])[],
  directed: boolean,
): Graph => {
  const builder = new GraphBuilder({ directed });

  for (const name of names) {
    builder.addVertex(id(name));
  }

  for (const [from, to, weight] of arcs) {
    builder.addEdge(id(from), id(to), weight);
  }

  return builder.build();
};

const chain = build(
  ['s', 'a', 't'],
  [
    ['s', 'a', 3],
    ['a', 't', 2],
  ],
  true,
);
const capacity = () => 1;
const undirected = pathGraph(3);
const directed = pathGraph(3, { directed: true });

describe('flows', () => {
  it('words every refusal', () => {
    for (const flow of [maxFlow, maxFlowDinic, minCut]) {
      expect(() => flow(undirected, id('0'), id('2'))).toThrow('maxFlow requires a directed graph');
      expect(() => flow(chain, id('s'), id('s'))).toThrow('source and sink must differ');
    }

    const negative = build(['s', 't'], [['s', 't', -1]], true);

    expect(() => maxFlow(negative, id('s'), id('t'))).toThrow('capacities must be non-negative');
  });

  it('splits the vertices on the min cut', () => {
    const cut = minCut(chain, id('s'), id('t'));

    expect(cut.value).toBe(2);
    expect(cut.sourceSide).toEqual(['s', 'a']);
    expect(cut.sinkSide).toEqual(['t']);
    expect(cut.edges.map((edge) => `${edge.source}>${edge.target}`)).toEqual(['a>t']);
  });

  it('words min-cost flow problems and accepts zero capacity', () => {
    const ends = { source: id('s'), sink: id('t') };

    expect(() => minCostFlow(undirected, { source: id('0'), sink: id('2') }, { capacity })).toThrow(
      'minCostFlow requires a directed graph',
    );

    expect(() => minCostFlow(chain, { source: id('s'), sink: id('s') }, { capacity })).toThrow(
      'source and sink must differ',
    );

    expect(() => minCostFlow(chain, ends, { capacity: () => -1 })).toThrow(
      'capacities must be non-negative',
    );

    expect(minCostFlow(chain, ends, { capacity: () => 0 }).flow).toBe(0);
  });
});

describe('cuts, cliques and centrality', () => {
  it('words global min cut problems', () => {
    expect(() => globalMinCut(directed)).toThrow('globalMinCut requires an undirected graph');
    expect(() => globalMinCut(pathGraph(1))).toThrow('globalMinCut needs at least two vertices');

    expect(() => globalMinCut(build(['a', 'b'], [['a', 'b', -1]], false))).toThrow(
      'weights must be non-negative',
    );
  });

  it('words clique, betweenness and planarity problems', () => {
    expect(() => maximalCliques(directed)).toThrow('maximalCliques requires an undirected graph');

    expect(() => approximateBetweenness(undirected, { samples: 0 })).toThrow(
      'samples must be a positive integer',
    );

    expect(() => isPlanar(directed)).toThrow('isPlanar requires an undirected graph');
  });
});

describe('communities', () => {
  it('words invalid options and accepts zero weights', () => {
    expect(() => louvain(undirected, { resolution: 0 })).toThrow(
      'resolution must be a positive finite number',
    );

    expect(() => louvain(build(['a', 'b'], [['a', 'b', -1]], false))).toThrow(
      'weights must be finite and non-negative',
    );

    expect(() => louvain(build(['a', 'b'], [['a', 'b', Infinity]], false))).toThrow(
      'weights must be finite and non-negative',
    );

    expect(louvain(build(['a', 'b'], [['a', 'b', 0]], false)).size).toBe(2);
  });
});

describe('matching and assignment', () => {
  it('lists pairs with the first color class first', () => {
    expect(maximumBipartiteMatching(pathGraph(2)).pairs).toEqual([['0', '1']]);
    expect(maximumMatching(pathGraph(2)).pairs).toEqual([['0', '1']]);

    expect(() => maximumBipartiteMatching(cycleGraph(3))).toThrow(
      'maximumBipartiteMatching requires a bipartite graph',
    );

    expect(() => maximumMatching(directed)).toThrow('maximumMatching requires an undirected graph');
  });

  it('leaves unmatched vertices out of a bipartite matching', () => {
    const star = build(
      ['c', 'x', 'y'],
      [
        ['c', 'x', 1],
        ['c', 'y', 1],
      ],
      false,
    );

    expect(maximumBipartiteMatching(star).size).toBe(1);
  });

  it('words assignment problems', () => {
    expect(() => minimumCostAssignment([[1, 2], [3]])).toThrow(
      'cost matrix must be rectangular with rows <= columns',
    );

    expect(() => minimumCostAssignment([[1], [2]])).toThrow('rows <= columns');
  });
});

describe('structure and treewidth', () => {
  it('names the failing function when a graph is directed', () => {
    expect(() => biconnectedComponents(directed)).toThrow(
      'biconnectedComponents requires an undirected graph',
    );

    expect(() => articulationPoints(directed)).toThrow(
      'articulationPoints requires an undirected graph',
    );

    expect(() => bridges(directed)).toThrow('bridges requires an undirected graph');
  });

  it('enforces the component size limit exactly', () => {
    expect(() => treewidth(pathGraph(5), { maxVertices: 4 })).toThrow(
      'treewidth supports components of at most 4 vertices (found 5); use treewidthUpperBound',
    );

    expect(treewidth(pathGraph(5), { maxVertices: 5 })).toBe(1);

    expect(() => treewidth(pathGraph(3), { maxVertices: 25 })).toThrow(
      'at most 24 vertices (found 3)',
    );

    expect(treewidth(completeGraph(3), { maxVertices: 24 })).toBe(2);
  });
});
