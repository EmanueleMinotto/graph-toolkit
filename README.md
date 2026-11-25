# graph-toolkit

TypeScript monorepo for graph theory: core model, matrices, operations, traversal, paths and cycles, trees, coloring, algorithms, import/export, normalization, layout and a visualization web app.

## Packages

| Package                                | Purpose                                           |
| -------------------------------------- | ------------------------------------------------- |
| [`@graph-toolkit/core`](packages/core) | Immutable CSR-backed graph, builder, typed errors |

More packages are added incrementally; see [docs/architecture.md](docs/architecture.md) for the planned dependency graph.

## Commands

```sh
pnpm install
pnpm turbo run typecheck test build   # per-package checks, cached
pnpm lint                             # ESLint, zero warnings allowed
pnpm format:check                     # Prettier
```

Contributing rules are in [CONTRIBUTING.md](CONTRIBUTING.md).
