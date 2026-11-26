import { bfs, dijkstra, greedyColoring, minimumSpanningForest, pageRank } from 'graph-toolkit';
import { Bench } from 'tinybench';
import { expect, it } from 'vitest';
import { randomWeighted } from './fixtures.js';

const size = { vertices: 20_000, edges: 80_000 };

it('reports throughput on 20k vertices / 80k edges', async () => {
  const undirected = randomWeighted(size, false);
  const directed = randomWeighted(size, true);
  const start = undirected.vertices()[0]!;
  const bench = new Bench({ time: 500 });

  bench
    .add('bfs', () => bfs(undirected, start))
    .add('dijkstra', () => dijkstra(directed, start))
    .add('greedy coloring', () => greedyColoring(undirected))
    .add('kruskal', () => minimumSpanningForest(undirected))
    .add('pagerank (20 iterations)', () => pageRank(directed, { maxIterations: 20 }));

  await bench.run();
  console.table(bench.table());
  expect(bench.tasks).toHaveLength(5);
}, 300_000);
