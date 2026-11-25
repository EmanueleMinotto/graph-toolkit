# @graph-toolkit/paths

Shortest paths and cycle detection. Depends on `core`, `math`, `traversal`.

## Usage

```ts
import { GraphBuilder, vertexId } from '@graph-toolkit/core';
import { dijkstra, hasCycle } from '@graph-toolkit/paths';

const [a, b, c] = [vertexId('a'), vertexId('b'), vertexId('c')];
const graph = new GraphBuilder({ directed: true })
  .addVertex(a)
  .addVertex(b)
  .addVertex(c)
  .addEdge(a, b, 1)
  .addEdge(b, c, 2)
  .build();

const tree = dijkstra(graph, a);
tree.distanceTo(c); // 3
tree.pathTo(c); // [a, b, c]
hasCycle(graph); // false
```

## API

| Function                     | Notes                                                               | Complexity        |
| ---------------------------- | ------------------------------------------------------------------- | ----------------- |
| `dijkstra(graph, source)`    | Non-negative weights only (throws `GraphError`).                    | O((V + E) log V)  |
| `bellmanFord(graph, source)` | Negative weights; throws `NegativeCycleError`.                      | O(V·E)            |
| `floydWarshall(graph)`       | All pairs → `DistanceMatrix`; throws `NegativeCycleError`.          | O(V³) time, O(V²) |
| `hasCycle(graph)`            | Directed (Kahn) and undirected (union-find); self-loops are cycles. | ~O(V + E)         |

Unreachable distances are `Infinity`; `pathTo` returns `undefined`. In undirected graphs a negative edge is a negative cycle. Planned: A*, k-shortest paths, Eulerian/Hamiltonian paths.
