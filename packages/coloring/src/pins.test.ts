import { randomGraph } from '@graph-sdk/generators';
import { describe, expect, it } from 'vitest';
import {
  bipartition,
  dsaturColoring,
  edgeColoring,
  exactColoring,
  greedyColoring,
} from './index.js';

const buildCases = () => {
  const graphs = [60, 61, 62, 63].map((seed) =>
    randomGraph(9, { probability: 0.25 + (seed % 4) * 0.1, seed }),
  );
  const sparse = randomGraph(12, { probability: 0.12, seed: 64 });

  return {
    greedy: graphs.map((graph) => [...greedyColoring(graph).colors.values()]),
    dsatur: [...graphs, sparse].map((graph) => [...dsaturColoring(graph).colors.values()]),
    exact: graphs.map((graph) => [...exactColoring(graph).colors.values()]),
    edge: graphs.map((graph) => edgeColoring(graph).edges.map((edge) => edge.color)),
    bipartition: [sparse, randomGraph(10, { probability: 0.1, seed: 65 })].map((graph) => {
      const parts = bipartition(graph);

      return parts === undefined ? null : [...parts.colors.values()];
    }),
  };
};

describe('pinned results', () => {
  it('keeps the seeded results of the coloring kernels', () => {
    expect(buildCases()).toEqual({});
  });
});
