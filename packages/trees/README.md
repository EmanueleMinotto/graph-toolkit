# @graph-toolkit/trees

Spanning trees and tree predicates for undirected graphs. Depends on `core`, `math`, `traversal`.

## Usage

```ts
import { minimumSpanningForest, isTree } from '@graph-toolkit/trees';

const forest = minimumSpanningForest(graph);
forest.totalWeight; // sum of chosen edge weights
isTree(graph); // connected and acyclic
```

## API

| Function                   | Notes                                                       | Complexity |
| -------------------------- | ----------------------------------------------------------- | ---------- |
| `minimumSpanningForest(g)` | Kruskal; one tree per component. Throws on directed graphs. | O(E log E) |
| `isForest(g)`, `isTree(g)` | `E = V - components` test; the empty graph is not a tree.   | O(V + E)   |

Planned: Prim/Borůvka, rooted trees, LCA, Prüfer codes.
