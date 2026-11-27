import { completeGraph, petersenGraph, randomGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  betweennessCentrality,
  closenessCentrality,
  globalMinCut,
  leiden,
  louvain,
  maximalCliques,
  maximumMatching,
  pageRank,
} from './index.js';

const sparse = randomGraph(24, { probability: 0.15, seed: 11 });
const dense = randomGraph(20, { probability: 0.35, seed: 12 });
const pairs = (entries: Iterable<readonly [unknown, number]>): number[] =>
  [...entries].map(([, value]) => Math.round(value * 1e5) / 1e5);

const cases = {
  louvainSparse: [...louvain(sparse).values()],
  louvainDense: [...louvain(dense).values()],
  leidenSparse: [...leiden(sparse).values()],
  leidenDense: [...leiden(dense).values()],
  louvainFine: [...louvain(dense, { resolution: 2.5 }).values()],
  leidenCoarse: [...leiden(dense, { resolution: 0.4 }).values()],
  matchSparse: maximumMatching(sparse).pairs.map(([left, right]) => `${left}-${right}`),
  matchDense: maximumMatching(dense).pairs.map(([left, right]) => `${left}-${right}`),
  matchPetersen: maximumMatching(petersenGraph()).pairs.map(([left, right]) => `${left}-${right}`),
  cliques: maximalCliques(dense).map((clique) => clique.join(',')),
  betweenness: pairs(betweennessCentrality(sparse)),
  closeness: pairs(closenessCentrality(sparse)),
  pagerank: pairs(pageRank(dense)),
  cutDense: [globalMinCut(dense).value, ...globalMinCut(dense).side],
  cutClique: [globalMinCut(completeGraph(5)).value],
};

describe('pinned results', () => {
  it('prints them', () => {
    expect(cases).toEqual({});
  });
});
