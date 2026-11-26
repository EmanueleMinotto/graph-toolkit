# @graph-sdk/io

Importers and exporters, no runtime dependencies besides `core` and `matrix`. Functions are pure string ⇄ `Graph`.

## Usage

```ts
import { fromGraphMl, toDot, toJson } from '@graph-sdk/io';

const graph = fromGraphMl(xmlText);
toDot(graph); // Graphviz source
toJson(graph); // { directed, vertices, edges }
```

## Formats

| Format        | Export           | Import                                   | Notes                                                                                                                     |
| ------------- | ---------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| JSON          | `toJson`         | `fromJson`                               | Validated; keeps isolated vertices, order and vertex/edge attributes.                                                     |
| Edge list/CSV | `toEdgeList`     | `fromEdgeList(text, { isDirected })`     | `source target [weight]`, `#` comments. No isolated vertices. Streaming: `toEdgeListLines`, `fromEdgeListStream(chunks)`. |
| DOT           | `toDot`          | `fromDot`                                | Nodes, edges, chains, `weight`; no subgraphs/ports.                                                                       |
| GraphML       | `toGraphMl`      | `fromGraphMl`                            | `weight` as `<data>` on edges; flat structure only.                                                                       |
| GEXF          | `toGexf`         | `fromGexf`                               | `weight` attribute; no dynamics/viz extensions.                                                                           |
| GML           | `toGml`          | `fromGml`                                | Numeric ids, `label` = vertex name, `weight` attribute; other keys ignored.                                               |
| graph6        | `toGraph6`       | `fromGraph6`                             | Simple undirected graphs; vertices become `"0"`..`"n-1"`.                                                                 |
| sparse6       | `toSparse6`      | `fromSparse6`                            | Sparse simple undirected graphs (`:` prefix); no self-loops.                                                              |
| Pajek `.net`  | `toPajek`        | `fromPajek`                              | `*Vertices`, `*Edges` / `*Arcs`, weights; other sections ignored.                                                         |
| DIMACS        | `toDimacs`       | `fromDimacs`                             | `p edge` + `e` lines, or `p sp` + `a` lines; vertices numbered from 1.                                                    |
| Mermaid       | `toMermaid`      | `fromMermaid`                            | Flowcharts: `-->`, `---`, `\|w\|` weights, node labels; no subgraphs.                                                     |
| Adjacency CSV | `toAdjacencyCsv` | `fromAdjacencyCsv(text, { isDirected })` | Vertex ids become `"0"`..`"n-1"`.                                                                                         |

Invalid input throws `ParseError`; duplicate edges throw `DuplicateError` from `core`. XML and DOT parsing is regex-based and intentionally limited to the shapes these exporters write plus common hand-written files; nested/namespaced documents are out of scope.
