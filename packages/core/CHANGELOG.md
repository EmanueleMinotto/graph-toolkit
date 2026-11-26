# @graph-sdk/core

## 0.2.0

### Minor Changes

- 384de06: Add vertex and edge attributes: `GraphBuilder.addVertex(id, attributes)`, `addEdge(a, b, { weight, attributes })`, `Graph.vertexAttributes`, `Graph.edgesBetween` and `Edge.attributes`. JSON import and export keep them.
- 68b8c01: Make graphs editable: `GraphBuilder.from(graph)` reopens an existing graph, and `removeEdge` / `removeVertex` delete edges and vertices (new `UnknownEdgeError`).

## 0.1.0

### Minor Changes

- a74da58: First public release of the graph-toolkit packages.
- 1c186c7: New: Petersen, wheel, bipartite, binary-tree, hypercube, G(n, m), Barabási–Albert and Watts–Strogatz generators; bridges, articulation points, biconnected components, k-cores, clustering, diameter/radius/center and transitive closure; min-cut, min-cost flow, blossom matching and Hungarian assignment; Johnson and DAG shortest paths; minimum arborescence and Steiner tree; treewidth upper bound; incidence matrix and spectrum; GML, graph6, sparse6, Pajek and DIMACS formats; radial, spectral and Tutte layouts; lazy BFS/DFS iterators; `AbortSignal` support for exponential searches.
