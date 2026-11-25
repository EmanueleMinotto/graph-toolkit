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

### More

| Export                                                            | Notes                                                                                                      | Complexity                     |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `primMinimumSpanningForest(g)`, `boruvkaMinimumSpanningForest(g)` | Same result weight as Kruskal; undirected only.                                                            | O(E log V)                     |
| `new RootedTree(g, root)`                                         | `parentOf`, `depthOf`, `childrenOf`, `lowestCommonAncestor` (binary lifting). Requires an undirected tree. | setup O(V log V), LCA O(log V) |
| `pruferCode(tree)`, `treeFromPruferCode(vertices, code)`          | Bijection between labeled trees and sequences of length n − 2.                                             | O(n log n)                     |
| `minimumSpanningArborescence(g, root)`                            | Chu–Liu/Edmonds minimum arborescence of a directed graph; `undefined` if some vertex is unreachable.       | O(V·E)                         |
