# @graph-sdk/io

## 0.2.1

### Patch Changes

- 926ed52: `fromDot` now reads quoted vertex names as opaque strings: `#`, `//`, `/*`, `;`, `=`, `[`, `{` or a line break inside quotes no longer corrupt the graph or drop edges.
- dccc4c7: `fromJson` now throws `ParseError` on malformed JSON instead of letting `SyntaxError` escape.
- ac0d83e: `fromPajek` now reads the `*Vertices 0` document that `toPajek` writes for an empty graph.

## 0.2.0

### Minor Changes

- 384de06: Add vertex and edge attributes: `GraphBuilder.addVertex(id, attributes)`, `addEdge(a, b, { weight, attributes })`, `Graph.vertexAttributes`, `Graph.edgesBetween` and `Edge.attributes`. JSON import and export keep them.
- 549151d: Add a compact binary format: `toBinary` and `fromBinary` encode a graph as a `Uint8Array` (varint counts, UTF-8 names, one byte per unit weight).
- d734154: Add streaming edge lists: `toEdgeListLines` yields lines lazily and `fromEdgeListStream` parses any sync or async iterable of text chunks without holding the whole text.

### Patch Changes

- Updated dependencies [384de06]
- Updated dependencies [68b8c01]
  - @graph-sdk/core@0.2.0
  - @graph-sdk/matrix@0.1.1

## 0.1.0

### Minor Changes

- a74da58: First public release of the graph-toolkit packages.
- 1c186c7: New: Petersen, wheel, bipartite, binary-tree, hypercube, G(n, m), Barabási–Albert and Watts–Strogatz generators; bridges, articulation points, biconnected components, k-cores, clustering, diameter/radius/center and transitive closure; min-cut, min-cost flow, blossom matching and Hungarian assignment; Johnson and DAG shortest paths; minimum arborescence and Steiner tree; treewidth upper bound; incidence matrix and spectrum; GML, graph6, sparse6, Pajek and DIMACS formats; radial, spectral and Tutte layouts; lazy BFS/DFS iterators; `AbortSignal` support for exponential searches.

### Patch Changes

- Updated dependencies [a74da58]
- Updated dependencies [1c186c7]
  - @graph-sdk/core@0.1.0
  - @graph-sdk/matrix@0.1.0
