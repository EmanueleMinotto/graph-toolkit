# graph-toolkit

## 0.3.0

### Minor Changes

- 4c293cd: Add `@graph-sdk/dynamic`: `diffGraphs`, `applyDiff`, `invertDiff` and an immutable undo/redo history (`createHistory`, `commit`, `undo`, `redo`).
- cd6aae3: Add `@graph-sdk/embedding`: seeded `randomWalks` (uniform or weighted) and `spectralEmbedding` (Laplacian eigenmaps).
- 75e52c5: Export `mulberry32` from `@graph-sdk/math` and use it in `algorithms`, `generators` and `embedding` instead of three private copies.
- 70002fe: Add `@graph-sdk/query`: `selectVertices` (`where`, `withAttribute`, `neighbors`, `within`, `subgraph`) and `filterEdges`.

### Patch Changes

- Updated dependencies [4c293cd]
- Updated dependencies [cd6aae3]
- Updated dependencies [75e52c5]
- Updated dependencies [70002fe]
  - @graph-sdk/dynamic@0.1.0
  - @graph-sdk/embedding@0.1.0
  - @graph-sdk/math@0.2.0
  - @graph-sdk/algorithms@0.2.1
  - @graph-sdk/generators@0.1.2
  - @graph-sdk/query@0.1.0
  - @graph-sdk/normalize@0.1.2
  - @graph-sdk/paths@0.1.2
  - @graph-sdk/trees@0.1.2
  - @graph-sdk/coloring@0.1.1
  - @graph-sdk/io@0.2.0
  - @graph-sdk/layout@0.1.1
  - @graph-sdk/matrix@0.1.1
  - @graph-sdk/operations@0.2.0
  - @graph-sdk/traversal@0.1.1

## 0.2.0

### Minor Changes

- d0c8da0: Add `approximateBetweenness`, a seeded pivot-sampling estimate of betweenness centrality.
- 384de06: Add vertex and edge attributes: `GraphBuilder.addVertex(id, attributes)`, `addEdge(a, b, { weight, attributes })`, `Graph.vertexAttributes`, `Graph.edgesBetween` and `Edge.attributes`. JSON import and export keep them.
- 549151d: Add a compact binary format: `toBinary` and `fromBinary` encode a graph as a `Uint8Array` (varint counts, UTF-8 names, one byte per unit weight).
- d734154: Add streaming edge lists: `toEdgeListLines` yields lines lazily and `fromEdgeListStream` parses any sync or async iterable of text chunks without holding the whole text.
- e8b7154: Add `globalMinCut`, the Stoer–Wagner global minimum cut of an undirected weighted graph.
- 616f483: Add `graphEditDistance`, the exact edit distance between two small graphs with configurable vertex and edge costs.
- 68b8c01: Make graphs editable: `GraphBuilder.from(graph)` reopens an existing graph, and `removeEdge` / `removeVertex` delete edges and vertices (new `UnknownEdgeError`).
- 07b7600: Add `leiden`: community detection with Leiden's refinement phase, same options as `louvain`.
- 75f1afb: Add `louvain`: weighted multi-level modularity community detection with a configurable resolution; communities are always connected.
- 577e26e: Add `treewidth`, an exact treewidth for small connected components (subset dynamic programming, cancellable).

### Patch Changes

- Updated dependencies [d0c8da0]
- Updated dependencies [384de06]
- Updated dependencies [549151d]
- Updated dependencies [d734154]
- Updated dependencies [e8b7154]
- Updated dependencies [616f483]
- Updated dependencies [68b8c01]
- Updated dependencies [07b7600]
- Updated dependencies [75f1afb]
- Updated dependencies [577e26e]
  - @graph-sdk/algorithms@0.2.0
  - @graph-sdk/core@0.2.0
  - @graph-sdk/io@0.2.0
  - @graph-sdk/operations@0.2.0
  - @graph-sdk/coloring@0.1.1
  - @graph-sdk/generators@0.1.1
  - @graph-sdk/layout@0.1.1
  - @graph-sdk/matrix@0.1.1
  - @graph-sdk/normalize@0.1.1
  - @graph-sdk/paths@0.1.1
  - @graph-sdk/traversal@0.1.1
  - @graph-sdk/trees@0.1.1

## 0.1.0

### Minor Changes

- a74da58: First public release of the graph-toolkit packages.
- 1c186c7: New: Petersen, wheel, bipartite, binary-tree, hypercube, G(n, m), Barabási–Albert and Watts–Strogatz generators; bridges, articulation points, biconnected components, k-cores, clustering, diameter/radius/center and transitive closure; min-cut, min-cost flow, blossom matching and Hungarian assignment; Johnson and DAG shortest paths; minimum arborescence and Steiner tree; treewidth upper bound; incidence matrix and spectrum; GML, graph6, sparse6, Pajek and DIMACS formats; radial, spectral and Tutte layouts; lazy BFS/DFS iterators; `AbortSignal` support for exponential searches.

### Patch Changes

- Updated dependencies [a74da58]
- Updated dependencies [1c186c7]
  - @graph-sdk/algorithms@0.1.0
  - @graph-sdk/coloring@0.1.0
  - @graph-sdk/core@0.1.0
  - @graph-sdk/generators@0.1.0
  - @graph-sdk/io@0.1.0
  - @graph-sdk/layout@0.1.0
  - @graph-sdk/math@0.1.0
  - @graph-sdk/matrix@0.1.0
  - @graph-sdk/normalize@0.1.0
  - @graph-sdk/operations@0.1.0
  - @graph-sdk/paths@0.1.0
  - @graph-sdk/traversal@0.1.0
  - @graph-sdk/trees@0.1.0
