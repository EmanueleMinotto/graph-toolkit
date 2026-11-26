# @graph-sdk/algorithms

## 0.2.0

### Minor Changes

- d0c8da0: Add `approximateBetweenness`, a seeded pivot-sampling estimate of betweenness centrality.
- e8b7154: Add `globalMinCut`, the Stoer–Wagner global minimum cut of an undirected weighted graph.
- 07b7600: Add `leiden`: community detection with Leiden's refinement phase, same options as `louvain`.
- 75f1afb: Add `louvain`: weighted multi-level modularity community detection with a configurable resolution; communities are always connected.
- 577e26e: Add `treewidth`, an exact treewidth for small connected components (subset dynamic programming, cancellable).

### Patch Changes

- Updated dependencies [384de06]
- Updated dependencies [68b8c01]
  - @graph-sdk/core@0.2.0
  - @graph-sdk/coloring@0.1.1

## 0.1.0

### Minor Changes

- a74da58: First public release of the graph-toolkit packages.
- 1c186c7: New: Petersen, wheel, bipartite, binary-tree, hypercube, G(n, m), Barabási–Albert and Watts–Strogatz generators; bridges, articulation points, biconnected components, k-cores, clustering, diameter/radius/center and transitive closure; min-cut, min-cost flow, blossom matching and Hungarian assignment; Johnson and DAG shortest paths; minimum arborescence and Steiner tree; treewidth upper bound; incidence matrix and spectrum; GML, graph6, sparse6, Pajek and DIMACS formats; radial, spectral and Tutte layouts; lazy BFS/DFS iterators; `AbortSignal` support for exponential searches.

### Patch Changes

- Updated dependencies [a74da58]
- Updated dependencies [1c186c7]
  - @graph-sdk/coloring@0.1.0
  - @graph-sdk/core@0.1.0
