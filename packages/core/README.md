# @graph-sdk/core

Immutable graph model backed by a compressed sparse row (CSR) adjacency structure.

## Usage

```ts
import { GraphBuilder, vertexId } from '@graph-sdk/core';

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

| Export                                                                   | Notes                                                                                                                                                           |
| ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GraphBuilder`                                                           | Mutable accumulator; `build()` returns an immutable `Graph`. `GraphBuilder.from(graph)` reopens a graph; `removeEdge` and `removeVertex` edit it ($O(E)$ each). |
| `Graph`                                                                  | `vertices`, `edges`, `hasVertex`, `hasEdge`, `neighbors`, `edgesBetween`, `vertexAttributes`, `degree`, `indexOf`, `vertexAt`, `csr`.                           |
| `Attributes`, `EdgeDetails`                                              | Immutable key–value data on vertices (`addVertex(id, attributes)`) and edges (`addEdge(a, b, { weight, attributes })`).                                         |
| `vertexId`, `VertexId`, `Weight`, `Edge`, `Csr`                          | Branded ids and plain data types.                                                                                                                               |
| `GraphError`, `UnknownVertexError`, `UnknownEdgeError`, `DuplicateError` | Typed errors.                                                                                                                                                   |

## Complexity

Build: $O(V + E)$. `degree`, `indexOf`, `hasVertex`: $O(1)$. `neighbors`, `hasEdge`: $O(\text{out-degree})$. `edges`: $O(V + E)$.

Attributes are copied and frozen when added. `Edge.attributes` is present only on edges that have some, and `edgesBetween(a, b)` returns every parallel edge between two vertices, each with its own attributes. Graphs without attributes carry no extra data. Graph transformations (`operations`, `normalize`) build new graphs and do not copy attributes.

Duplicate vertices are always rejected; duplicate edges are rejected unless the builder is created with `{ allowParallelEdges: true }`, which yields a multigraph (parallel edges and loops each count in `edgeCount`, `degree` and `edges()`). `adjacencyMatrix` sums parallel edges; algorithms that assume simple graphs (isomorphism, planarity, `hasEdge` semantics) treat them as a single connection. Undirected self-loops are stored once and count once in the degree.
