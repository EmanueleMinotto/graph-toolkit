# @graph-toolkit/core

Immutable graph model backed by a compressed sparse row (CSR) adjacency structure.

## Usage

```ts
import { GraphBuilder, vertexId } from '@graph-toolkit/core';

const [a, b, c] = [vertexId('a'), vertexId('b'), vertexId('c')];
const graph = new GraphBuilder({ directed: false })
  .addVertex(a)
  .addVertex(b)
  .addVertex(c)
  .addEdge(a, b, 2)
  .addEdge(b, c)
  .build();

graph.hasEdge(b, a); // true (undirected)
graph.degree(b); // 2
graph.neighbors(a); // [{ source: a, target: b, weight: 2 }]
```

## API

| Export                                               | Notes                                                                                             |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `GraphBuilder`                                       | Mutable accumulator; `build()` returns an immutable `Graph`.                                      |
| `Graph`                                              | `vertices`, `edges`, `hasVertex`, `hasEdge`, `neighbors`, `degree`, `indexOf`, `vertexAt`, `csr`. |
| `vertexId`, `VertexId`, `Weight`, `Edge`, `Csr`      | Branded ids and plain data types.                                                                 |
| `GraphError`, `UnknownVertexError`, `DuplicateError` | Typed errors.                                                                                     |

## Complexity

Build: O(V + E). `degree`, `indexOf`, `hasVertex`: O(1). `neighbors`, `hasEdge`: O(out-degree). `edges`: O(V + E).

Duplicate vertices/edges are rejected (no multigraphs yet). Undirected self-loops are stored once and count once in the degree.
