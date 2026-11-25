# Architecture

## Dependency graph (acyclic)

```text
core ─┬─ math ─┬─ matrix
      │        ├─ paths ──────┐
      │        ├─ trees       ├─ algorithms
      ├─ traversal ───────────┘
      ├─ operations · coloring · generators · normalize · layout
      └─ io (core, matrix, normalize)
graph-toolkit = facade re-exporting everything
```

## Graph representation

Vertices are branded string ids (`VertexId`) mapped once to dense indices `0..n-1`. Adjacency is stored in CSR form (`Uint32Array` offsets/targets, `Float64Array` weights). Undirected edges are stored as two arcs. Algorithms operate on indices; id↔index translation happens only at the API boundary.

## Mutation policy

Public types are `readonly`. Algorithm kernels in `src/internal/**` may use local mutable typed arrays; they never escape the function that creates them.
