# @graph-toolkit/traversal

Graph traversal. Depends on `@graph-toolkit/core`.

## Usage

```ts
import { GraphBuilder, vertexId } from '@graph-toolkit/core';
import { bfs, connectedComponents, dfs, topologicalSort } from '@graph-toolkit/traversal';

const [a, b, c] = [vertexId('a'), vertexId('b'), vertexId('c')];
const graph = new GraphBuilder().addVertex(a).addVertex(b).addVertex(c).addEdge(a, b).build();

bfs(graph, a); // [a, b]
dfs(graph, a); // [a, b]
connectedComponents(graph); // [[a, b], [c]]
```

## API

| Function                                                 | Notes                                                         | Complexity |
| -------------------------------------------------------- | ------------------------------------------------------------- | ---------- |
| `bfs(graph, start)`                                      | Breadth-first order of reachable vertices.                    | O(V + E)   |
| `bfsIterator(graph, start)`, `dfsIterator(graph, start)` | Lazy variants: yield vertices on demand and stop early.       | O(V + E)   |
| `dfs(graph, start)`                                      | Iterative depth-first preorder, neighbors in insertion order. | O(V + E)   |
| `topologicalSort(graph)`                                 | Kahn's algorithm; `undefined` when the graph has a cycle.     | O(V + E)   |
| `connectedComponents(graph)`                             | Undirected graphs only (throws `GraphError` otherwise).       | O(V + E)   |
| `stronglyConnectedComponents(g)`                         | Iterative Tarjan; directed only, sink components first.       | O(V + E)   |
