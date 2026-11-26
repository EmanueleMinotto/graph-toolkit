# @graph-sdk/algorithms

Network algorithms. Depends on `core` and `coloring` (bipartition for matching).

## Usage

```ts
import {
  betweennessCentrality,
  isPlanar,
  maxFlow,
  maximumBipartiteMatching,
} from '@graph-sdk/algorithms';

maxFlow(network, source, sink); // 23
isPlanar(graph); // true / false
betweennessCentrality(graph); // Map<VertexId, number>
maximumBipartiteMatching(bipartiteGraph).size;
```

## API

| Function                                                          | Notes                                                                     | Complexity                              |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| `maxFlow(g, s, t)`                                                | Edmonds–Karp. Directed graph, weights are capacities ≥ 0.                 | $O(V \cdot E^2)$                        |
| `maxFlowDinic(g, s, t)`                                           | Dinic, same contract.                                                     | $O(V^2 \cdot E)$                        |
| `maximumBipartiteMatching(g)`                                     | Hopcroft–Karp; throws on non-bipartite graphs. Returns `{ pairs, size }`. | $O(E \cdot \sqrt{V})$                   |
| `pageRank(g, options?)`                                           | Power iteration; ranks sum to 1; weights ignored.                         | $O(k \cdot (V+E))$                      |
| `degreeCentrality(g)`                                             | Out-degree / (V − 1).                                                     | $O(V)$                                  |
| `closenessCentrality(g)`                                          | Wasserman–Faust on hop distances; safe on disconnected graphs.            | $O(V \cdot (V+E))$                      |
| `betweennessCentrality(g)`                                        | Brandes, unnormalized, hop distances.                                     | $O(V \cdot E)$                          |
| `communities(g, maxRounds?)`                                      | Greedy modularity local moving (Louvain phase 1), deterministic.          | $O(\text{rounds} \cdot E)$              |
| `maximalCliques(g)`, `maximumClique(g)`                           | Bron–Kerbosch with pivoting; output can be exponential.                   | exponential                             |
| `isPlanar(g)`                                                     | Biconnected blocks + Demoucron–Malgrange–Pertuiset; self-loops ignored.   | $O(V^2)$ per block                      |
| `minCut(g, s, t)`                                                 | Max-flow min-cut: `{ value, sourceSide, sinkSide, edges }`.               | $O(V \cdot E^2)$                        |
| `minCostFlow(g, { source, sink }, { capacity, amount? })`         | Successive shortest paths; weights are per-unit costs.                    | $O(F \cdot V \cdot E)$                  |
| `maximumMatching(g)`                                              | Edmonds' blossom: maximum matching on any undirected graph.               | $O(V \cdot E)$ per phase                |
| `minimumCostAssignment(costs)`                                    | Hungarian algorithm on a rows ≤ columns cost matrix.                      | $O(\text{rows}^2 \cdot \text{columns})$ |
| `bridges(g)`, `articulationPoints(g)`, `biconnectedComponents(g)` | Cut structure of undirected graphs.                                       | $O(V + E)$                              |
| `kCores(g)`, `clusteringCoefficients(g)`, `averageClustering(g)`  | Core numbers and triangle density.                                        | $O(V \cdot E)$ / $O(\sum \text{deg}^2)$ |
| `eccentricities(g)`, `diameter(g)`, `radius(g)`, `center(g)`      | Hop-distance measures (`Infinity` when disconnected).                     | $O(V \cdot (V+E))$                      |
| `transitiveClosure(g)`                                            | Directed graph linking every vertex to everything it reaches.             | $O(V \cdot (V+E))$                      |
| `treewidthUpperBound(g)`                                          | Min-degree elimination; exact on trees, cycles and cliques.               | $O(V^2)$                                |

`maximalCliques` and `maximumClique` accept `{ signal }` (any `AbortSignal`) to cancel long searches.

Planarity is verified exhaustively against all 1024 graphs on five vertices and against K₅, K₃,₃, Petersen and subdivisions. Communities use one Louvain phase only (no aggregation), so very hierarchical structure may be merged coarsely.
