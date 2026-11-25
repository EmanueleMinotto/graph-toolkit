# Glossary

| Term                    | Meaning in graph-toolkit                                                                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Vertex / `VertexId`** | A node, identified by an opaque branded string.                                                                                                      |
| **Edge / arc**          | A weighted connection. In directed graphs edges are arcs `source → target`; undirected edges are stored as two arcs but counted once in `edgeCount`. |
| **Weight**              | A number on an edge, default 1. Used as distance (paths, trees) or capacity (flow).                                                                  |
| **Degree**              | Number of arcs leaving a vertex (`graph.degree`); a self-loop counts once.                                                                           |
| **CSR**                 | Compressed sparse row: `offsets`, `targets`, `weights` typed arrays; the arcs of vertex `v` sit in `[offsets[v], offsets[v+1])`.                     |
| **Path / walk**         | A path repeats no vertex; a walk may. `kShortestPaths` returns loopless paths.                                                                       |
| **Cycle**               | A closed path. `hasCycle` treats self-loops as cycles.                                                                                               |
| **DAG**                 | Directed acyclic graph: has a topological order.                                                                                                     |
| **Connected component** | Maximal vertex set with a path between any two (undirected). **Strongly connected component**: same with directed paths.                             |
| **Tree / forest**       | Connected acyclic graph / acyclic graph (one tree per component).                                                                                    |
| **Spanning forest**     | Subgraph containing every vertex as a forest; _minimum_ when the total weight is least.                                                              |
| **Bipartite**           | Vertices split in two sets with every edge between them (no odd cycle).                                                                              |
| **Matching**            | Edges sharing no endpoint; _maximum_ when largest.                                                                                                   |
| **Chromatic number**    | Fewest colors in a proper vertex coloring.                                                                                                           |
| **Clique**              | Vertex set where every pair is adjacent; _maximal_ when not extendable.                                                                              |
| **Eulerian trail**      | Walk using every edge exactly once. **Hamiltonian path**: visits every vertex exactly once.                                                          |
| **Planar**              | Drawable in the plane without crossing edges.                                                                                                        |
| **Isomorphism**         | Bijection between vertex sets preserving adjacency.                                                                                                  |
| **Line graph**          | Graph whose vertices are the edges of the original.                                                                                                  |
| **Centrality**          | Score of a vertex's importance: degree, closeness (nearness to others), betweenness (share of shortest paths through it).                            |
| **Modularity**          | Quality of a partition into communities; `communities` greedily maximizes it.                                                                        |
