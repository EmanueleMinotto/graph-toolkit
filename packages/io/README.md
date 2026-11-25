# @graph-toolkit/io

Importers and exporters, no runtime dependencies besides `core` and `matrix`. Functions are pure string ⇄ `Graph`.

## Usage

```ts
import { fromGraphMl, toDot, toJson } from '@graph-toolkit/io';

const graph = fromGraphMl(xmlText);
toDot(graph); // Graphviz source
toJson(graph); // { directed, vertices, edges }
```

## Formats

| Format        | Export           | Import                                   | Notes                                                                 |
| ------------- | ---------------- | ---------------------------------------- | --------------------------------------------------------------------- |
| JSON          | `toJson`         | `fromJson`                               | Validated; keeps isolated vertices and order.                         |
| Edge list/CSV | `toEdgeList`     | `fromEdgeList(text, { isDirected })`     | `source target [weight]`, `#` comments. No isolated vertices.         |
| DOT           | `toDot`          | `fromDot`                                | Nodes, edges, chains, `weight`; no subgraphs/ports.                   |
| GraphML       | `toGraphMl`      | `fromGraphMl`                            | `weight` as `<data>` on edges; flat structure only.                   |
| GEXF          | `toGexf`         | `fromGexf`                               | `weight` attribute; no dynamics/viz extensions.                       |
| Mermaid       | `toMermaid`      | `fromMermaid`                            | Flowcharts: `-->`, `---`, `\|w\|` weights, node labels; no subgraphs. |
| Adjacency CSV | `toAdjacencyCsv` | `fromAdjacencyCsv(text, { isDirected })` | Vertex ids become `"0"`..`"n-1"`.                                     |

Invalid input throws `ParseError`; duplicate edges throw `DuplicateError` from `core`. XML and DOT parsing is regex-based and intentionally limited to the shapes these exporters write plus common hand-written files; nested/namespaced documents are out of scope.
