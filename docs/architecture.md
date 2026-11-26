# Architecture

## Dependency graph (acyclic)

```text
math (no deps: heap, union-find, seeded PRNG)
core (no deps)
core ─┬─ matrix · operations · coloring · layout · traversal
      ├─ generators (core, math)
      ├─ io (core, matrix)
      ├─ normalize (core, math)
      ├─ cli (core, io, generators, traversal)
      ├─ dynamic (core)
      ├─ embedding (core, math, matrix)
      ├─ query (core)
      ├─ paths (core, math, traversal)
      ├─ trees (core, math, traversal)
      └─ algorithms (core, math, coloring)
graph-toolkit = facade re-exporting everything
```

## Graph representation

Vertices are branded string ids (`VertexId`) mapped once to dense indices `0..n-1`. Adjacency is stored in CSR form (`Uint32Array` offsets/targets, `Float64Array` weights). Undirected edges are stored as two arcs. Algorithms operate on indices; id↔index translation happens only at the API boundary.

## Mutation policy

Public types are `readonly`. Algorithm kernels in `src/internal/**` may use local mutable typed arrays; they never escape the function that creates them.
