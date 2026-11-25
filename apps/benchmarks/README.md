# @graph-toolkit/benchmarks

Private package with two performance tools, using a deterministic random graph of 100k vertices and 400k edges.

- `pnpm --filter @graph-toolkit/benchmarks test` — **budget tests** (run in CI). Each algorithm must finish within a budget that is roughly 6–10× its laptop time, so only order-of-magnitude regressions fail (accidental O(n²), copies in hot loops).
- `pnpm --filter @graph-toolkit/benchmarks bench` — tinybench run (outside the normal test run) with throughput numbers on a 20k/80k graph, for comparing before/after a change.

Reference times on the 100k/400k graph (laptop): BFS 6 ms, connected components 6 ms, Dijkstra 53 ms, greedy coloring 90 ms, Kruskal 140 ms, PageRank (20 iterations) 78 ms.
