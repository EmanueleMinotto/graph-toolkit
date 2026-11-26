# @graph-sdk/operations

Pure operations that return new graphs. Depends on `core`.

## Usage

```ts
import { cycleGraph, pathGraph } from '@graph-sdk/generators';
import { complement, union } from '@graph-sdk/operations';

complement(cycleGraph(5)).edgeCount; // 5 (the pentagram)
union(pathGraph(3), cycleGraph(4)).edgeCount; // 4
```

## API

| Function                            | Notes                                                    |
| ----------------------------------- | -------------------------------------------------------- |
| `inducedSubgraph(g, keep)`          | Keeps graph order; edges with both endpoints kept.       |
| `transpose(g)`                      | Reverses arcs; undirected graphs returned as-is.         |
| `complement(g)`                     | Loop-free; new edges weigh 1. $O(V^2 \cdot \text{deg})$. |
| `union(a, b)`, `intersection(a, b)` | Same directedness required; weights from `a`.            |

### Structure operations

| Function                                            | Notes                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| `cartesianProduct(a, b)`, `tensorProduct(a, b)`     | Same directedness; ids `(x,y)`; tensor weights multiply.                    |
| `lineGraph(g)`                                      | One vertex per edge (`a--b` / `a->b`). $O(E^2)$.                            |
| `contractEdge(g, keep, merge)`                      | Drops loops, keeps first parallel edge.                                     |
| `areIsomorphic(a, b)`, `findGraphIsomorphism(a, b)` | Backtracking on degrees/adjacency, weights ignored; exponential worst case. |

`areIsomorphic` and `findGraphIsomorphism` accept `{ signal }` to cancel long searches.
