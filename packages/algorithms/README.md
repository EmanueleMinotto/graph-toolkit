# @graph-toolkit/algorithms

Network algorithms. Depends on `core`.

## Usage

```ts
import { maxFlow, pageRank } from '@graph-toolkit/algorithms';

maxFlow(network, source, sink); // 23
pageRank(graph, { damping: 0.85 }); // Map<VertexId, number>, sums to 1
```

## API

| Function                   | Notes                                                             | Complexity |
| -------------------------- | ----------------------------------------------------------------- | ---------- |
| `maxFlow(g, source, sink)` | Edmonds–Karp; directed graph, weights = capacities (≥ 0).         | O(V·E²)    |
| `pageRank(g, options?)`    | Power iteration; dangling mass spread uniformly; weights ignored. | O(k·(V+E)) |

Planned: Dinic, matching (Hopcroft–Karp), centralities, communities, planarity, cliques.
