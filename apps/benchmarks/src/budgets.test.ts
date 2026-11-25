import {
  bfs,
  connectedComponents,
  dijkstra,
  greedyColoring,
  minimumSpanningForest,
  pageRank,
  type Graph,
} from 'graph-toolkit';
import { beforeAll, describe, expect, it } from 'vitest';
import { LARGE, randomWeighted } from './fixtures.js';

/**
 * Regression guard: budgets are roughly 6–10× the times measured on a laptop (6–140 ms), so only order-of-magnitude
 * regressions (accidental O(n²), copies in hot loops) fail, not CI noise.
 */
const BUDGET_MS = {
  bfs: 300,
  components: 300,
  dijkstra: 800,
  greedyColoring: 1000,
  mst: 1500,
  pageRank: 1000,
} as const;

function timed(action: () => unknown): number {
  const start = performance.now();
  action();
  return performance.now() - start;
}

describe(`performance budgets (${LARGE.vertices} vertices, ${LARGE.edges} edges)`, () => {
  let undirected: Graph;
  let directed: Graph;

  beforeAll(() => {
    undirected = randomWeighted(LARGE, false);
    directed = randomWeighted(LARGE, true);
  });

  it('bfs', () => {
    expect(timed(() => bfs(undirected, undirected.vertices()[0]!))).toBeLessThan(BUDGET_MS.bfs);
  });

  it('connected components', () => {
    expect(timed(() => connectedComponents(undirected))).toBeLessThan(BUDGET_MS.components);
  });

  it('dijkstra', () => {
    expect(timed(() => dijkstra(directed, directed.vertices()[0]!))).toBeLessThan(
      BUDGET_MS.dijkstra,
    );
  });

  it('greedy coloring', () => {
    expect(timed(() => greedyColoring(undirected))).toBeLessThan(BUDGET_MS.greedyColoring);
  });

  it('kruskal spanning forest', () => {
    expect(timed(() => minimumSpanningForest(undirected))).toBeLessThan(BUDGET_MS.mst);
  });

  it('pagerank', () => {
    expect(timed(() => pageRank(directed, { maxIterations: 20 }))).toBeLessThan(BUDGET_MS.pageRank);
  });
});
