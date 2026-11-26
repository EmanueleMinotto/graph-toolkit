# @graph-sdk/query

Fluent, immutable vertex selection and edge filtering. Depends on `core` only.

## Usage

```ts
import { filterEdges, selectVertices } from '@graph-sdk/query';

selectVertices(graph)
  .withAttribute('kind', 'city')
  .within(2) // plus everything within two outgoing edges
  .subgraph(); // induced graph, attributes kept

filterEdges(graph, ({ weight }) => weight <= 10); // same vertices, fewer edges
```

## API

| Method                     | Result                                                   |
| -------------------------- | -------------------------------------------------------- |
| `selectVertices(g, ids?)`  | A `VertexQuery` over all vertices, or over `ids`         |
| `.where(predicate)`        | Keeps vertices where `predicate(id, attributes)` holds   |
| `.withAttribute(key, v?)`  | Keeps vertices having `key`, with value `v` when given   |
| `.neighbors()`             | Vertices one outgoing edge away                          |
| `.within(hops)`            | Selection plus everything within `hops` outgoing edges   |
| `.ids()` / `.count()`      | Selected ids (graph order) / their number                |
| `.edges()` / `.subgraph()` | Edges inside the selection / the induced graph           |
| `filterEdges(g, keep)`     | New graph with all vertices and the edges `keep` accepts |

Every method returns a new selection; the graph is never modified.
