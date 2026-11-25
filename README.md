# graph-toolkit

[![CI](https://github.com/EmanueleMinotto/graph-toolkit/actions/workflows/ci.yml/badge.svg)](https://github.com/EmanueleMinotto/graph-toolkit/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A522-339933.svg)](.nvmrc)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](tsconfig.base.json)

TypeScript monorepo for graph theory: immutable CSR-backed graphs, traversal, shortest paths, spanning trees, coloring, flow, matching, centrality, planarity, spectra, import/export, layouts and a visualization web app.

- [Web app](https://emanueleminotto.github.io/graph-toolkit/app/) — explore, import and analyze graphs in the browser
- [API reference](https://emanueleminotto.github.io/graph-toolkit/api/) — TypeDoc for every package

## Quick start

```ts
import { cycleGraph, dijkstra, toDot } from 'graph-toolkit';

const graph = cycleGraph(5);
dijkstra(graph, graph.vertices()[0]!).distanceTo(graph.vertices()[2]!); // 2
toDot(graph);
```

`graph-toolkit` re-exports everything; prefer the individual `@graph-sdk/*` packages when bundle size matters.

## Packages

| Package                                        | Purpose                                                                                                               |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [`graph-toolkit`](packages/graph-toolkit)      | Facade: one import for all packages below                                                                             |
| [`@graph-sdk/core`](packages/core)             | Immutable CSR-backed graph, builder, typed errors                                                                     |
| [`@graph-sdk/math`](packages/math)             | Priority queue, disjoint set                                                                                          |
| [`@graph-sdk/matrix`](packages/matrix)         | Adjacency and Laplacian matrices, matrix algebra, graph conversion                                                    |
| [`@graph-sdk/operations`](packages/operations) | Union, intersection, complement, subgraph, transpose                                                                  |
| [`@graph-sdk/traversal`](packages/traversal)   | BFS, DFS, topological order, connected components                                                                     |
| [`@graph-sdk/paths`](packages/paths)           | Dijkstra, Bellman-Ford, Floyd-Warshall, cycle detection                                                               |
| [`@graph-sdk/trees`](packages/trees)           | Spanning trees, tree/forest predicates                                                                                |
| [`@graph-sdk/coloring`](packages/coloring)     | Greedy, DSATUR and exact vertex coloring, edge coloring, bipartiteness                                                |
| [`@graph-sdk/algorithms`](packages/algorithms) | Flow and min-cut, matching, assignment, PageRank, centrality, communities, cliques, planarity, connectivity structure |
| [`@graph-sdk/generators`](packages/generators) | Classic and seeded random graph generators                                                                            |
| [`@graph-sdk/normalize`](packages/normalize)   | Canonical ordering, relabeling, self-loop removal                                                                     |
| [`@graph-sdk/io`](packages/io)                 | JSON, edge list/CSV, DOT, GraphML, GEXF, GML, graph6, Mermaid, adjacency CSV                                          |
| [`@graph-sdk/layout`](packages/layout)         | Deterministic 2D layouts: circular, grid, force-directed, layered, radial                                             |

## Apps

| App                                  | Purpose                                                     |
| ------------------------------------ | ----------------------------------------------------------- |
| [`apps/web`](apps/web)               | React + Mantine explorer: generate, import, edit, analyze   |
| [`apps/benchmarks`](apps/benchmarks) | Performance budget tests and on-demand benchmarks (private) |

## Documentation

- [Architecture](docs/architecture.md) — dependency graph, graph representation, mutation policy
- [Glossary](docs/glossary.md) — terms as used in this project
- [Contributing](CONTRIBUTING.md) — commit, style and release rules

## Commands

Requires Node ≥ 22 and pnpm.

```sh
pnpm install
pnpm turbo run typecheck test build   # per-package checks, cached
pnpm lint                             # ESLint, zero warnings allowed
pnpm format:check                     # Prettier
pnpm docs:api                         # TypeDoc API reference into docs/api
```

## License

[MIT](LICENSE)
