# @graph-toolkit/algorithms

Network algorithms. Depends on `core` and `coloring` (bipartition for matching).

## Usage

```ts
import {
  betweennessCentrality,
  isPlanar,
  maxFlow,
  maximumBipartiteMatching,
} from '@graph-toolkit/algorithms';

maxFlow(network, source, sink); // 23
isPlanar(graph); // true / false
betweennessCentrality(graph); // Map<VertexId, number>
maximumBipartiteMatching(bipartiteGraph).size;
```

## API

| Function                                | Notes                                                                     | Complexity      |
| --------------------------------------- | ------------------------------------------------------------------------- | --------------- |
| `maxFlow(g, s, t)`                      | Edmonds–Karp. Directed graph, weights are capacities ≥ 0.                 | O(V·E²)         |
| `maxFlowDinic(g, s, t)`                 | Dinic, same contract.                                                     | O(V²·E)         |
| `maximumBipartiteMatching(g)`           | Hopcroft–Karp; throws on non-bipartite graphs. Returns `{ pairs, size }`. | O(E·√V)         |
| `pageRank(g, options?)`                 | Power iteration; ranks sum to 1; weights ignored.                         | O(k·(V+E))      |
| `degreeCentrality(g)`                   | Out-degree / (V − 1).                                                     | O(V)            |
| `closenessCentrality(g)`                | Wasserman–Faust on hop distances; safe on disconnected graphs.            | O(V·(V+E))      |
| `betweennessCentrality(g)`              | Brandes, unnormalized, hop distances.                                     | O(V·E)          |
| `communities(g, maxRounds?)`            | Greedy modularity local moving (Louvain phase 1), deterministic.          | O(rounds·E)     |
| `maximalCliques(g)`, `maximumClique(g)` | Bron–Kerbosch with pivoting; output can be exponential.                   | exponential     |
| `isPlanar(g)`                           | Biconnected blocks + Demoucron–Malgrange–Pertuiset; self-loops ignored.   | O(V²) per block |

Planarity is verified exhaustively against all 1024 graphs on five vertices and against K₅, K₃,₃, Petersen and subdivisions. Communities use one Louvain phase only (no aggregation), so very hierarchical structure may be merged coarsely.
