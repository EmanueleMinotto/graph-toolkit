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

const pairs = (entries: Iterable<readonly [unknown, number]>): number[] =>
  [...entries].map(([, value]) => Math.round(value * 1e5) / 1e5);

const buildCases = () => {
  const sparse = randomGraph(24, { probability: 0.15, seed: 11 });
  const dense = randomGraph(20, { probability: 0.35, seed: 12 });

  return {
    louvainSparse: [...louvain(sparse).values()],
    louvainDense: [...louvain(dense).values()],
    leidenSparse: [...leiden(sparse).values()],
    leidenDense: [...leiden(dense).values()],
    louvainFine: [...louvain(dense, { resolution: 2.5 }).values()],
    leidenCoarse: [...leiden(dense, { resolution: 0.4 }).values()],
    matchSparse: maximumMatching(sparse).pairs.map(([left, right]) => `${left}-${right}`),
    matchDense: maximumMatching(dense).pairs.map(([left, right]) => `${left}-${right}`),
    matchPetersen: maximumMatching(petersenGraph()).pairs.map(
      ([left, right]) => `${left}-${right}`,
    ),
    cliques: maximalCliques(dense).map((clique) => clique.join(',')),
    betweenness: pairs(betweennessCentrality(sparse)),
    closeness: pairs(closenessCentrality(sparse)),
    pagerank: pairs(pageRank(dense)),
    cutDense: [globalMinCut(dense).value, ...globalMinCut(dense).side],
    cutClique: [globalMinCut(completeGraph(5)).value],
  };
};

describe('pinned results', () => {
  it('keeps the seeded results of the kernels', () => {
    expect(buildCases()).toEqual({
      betweenness: [
        25.72619, 15.33333, 15.45238, 9.26948, 24.94968, 19.47673, 13.60119, 0, 9.8171, 49.91613,
        11.40043, 6.88258, 7.6921, 17.42424, 16.81115, 15.91667, 19.93939, 3.75758, 29.05411,
        38.55357, 6.2592, 9.63258, 4.66667, 17.46753,
      ],
      cliques: [
        '1,3,5,13',
        '1,3,18',
        '1,6,13',
        '1,6,19',
        '1,19,5',
        '1,0',
        '5,8,17',
        '5,12,7',
        '5,12,13',
        '5,12,16,17',
        '5,2,13',
        '5,3,17',
        '6,8',
        '6,13,4',
        '6,14,19',
        '6,14,4',
        '8,11',
        '11,12,14,16',
        '11,12,14,10',
        '11,12,9,16',
        '11,18,16',
        '13,4,9',
        '13,9,12',
        '15,18,3',
        '15,18,16',
        '15,7,9,12',
        '15,7,9,0',
        '15,7,9,4',
        '15,9,16,12',
        '15,9,16,4',
        '15,14,17,16,4',
        '15,14,17,16,12',
        '15,14,17,3',
        '15,14,17,10,4',
        '15,14,17,10,12',
        '15,14,19',
        '15,14,0,2',
        '15,14,0,10',
      ],
      closeness: [
        0.37097, 0.42593, 0.41071, 0.46, 0.46939, 0.46, 0.38983, 0.27381, 0.40351, 0.52273, 0.44231,
        0.38983, 0.42593, 0.41071, 0.46, 0.44231, 0.41071, 0.35385, 0.47917, 0.45098, 0.43396,
        0.38333, 0.38333, 0.46939,
      ],
      cutClique: [4],
      cutDense: [4, '8'],
      leidenCoarse: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      leidenDense: [0, 1, 0, 1, 0, 1, 1, 2, 1, 2, 0, 2, 2, 1, 0, 0, 2, 0, 2, 1],
      leidenSparse: [0, 1, 2, 1, 3, 1, 0, 0, 2, 1, 1, 3, 1, 1, 1, 3, 2, 2, 0, 0, 0, 2, 1, 0],
      louvainDense: [0, 1, 0, 1, 0, 1, 1, 2, 1, 2, 0, 2, 2, 1, 0, 0, 2, 0, 2, 1],
      louvainFine: [0, 1, 0, 2, 3, 4, 1, 5, 6, 5, 7, 6, 8, 9, 10, 11, 12, 13, 2, 1],
      louvainSparse: [0, 1, 2, 1, 3, 1, 0, 0, 2, 1, 1, 3, 1, 1, 1, 3, 2, 2, 0, 0, 0, 2, 1, 0],
      matchDense: ['0-1', '2-5', '3-13', '4-6', '7-9', '8-11', '10-12', '14-19', '15-18', '16-17'],
      matchPetersen: ['0-1', '2-3', '4-9', '5-7', '6-8'],
      matchSparse: [
        '0-7',
        '1-3',
        '2-17',
        '4-23',
        '5-8',
        '6-16',
        '9-18',
        '10-19',
        '11-21',
        '12-13',
        '14-22',
        '15-20',
      ],
      pagerank: [
        0.04614, 0.04751, 0.03454, 0.04603, 0.05663, 0.06416, 0.04171, 0.03979, 0.02987, 0.05106,
        0.04517, 0.04654, 0.06182, 0.05212, 0.07407, 0.07957, 0.0564, 0.05675, 0.03504, 0.03508,
      ],
    });
  });
});
