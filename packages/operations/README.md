# @graph-toolkit/operations

Pure operations that return new graphs. Depends on `core`.

## Usage

```ts
import { cycleGraph, pathGraph } from '@graph-toolkit/generators';
import { complement, union } from '@graph-toolkit/operations';

complement(cycleGraph(5)).edgeCount; // 5 (the pentagram)
union(pathGraph(3), cycleGraph(4)).edgeCount; // 4
```

## API

| Function                            | Notes                                              |
| ----------------------------------- | -------------------------------------------------- |
| `inducedSubgraph(g, keep)`          | Keeps graph order; edges with both endpoints kept. |
| `transpose(g)`                      | Reverses arcs; undirected graphs returned as-is.   |
| `complement(g)`                     | Loop-free; new edges weigh 1. O(V² · deg).         |
| `union(a, b)`, `intersection(a, b)` | Same directedness required; weights from `a`.      |

### Structure operations

| Function                                            | Notes                                                                       |
| --------------------------------------------------- | --------------------------------------------------------------------------- |
| `cartesianProduct(a, b)`, `tensorProduct(a, b)`     | Same directedness; ids `(x,y)`; tensor weights multiply.                    |
| `lineGraph(g)`                                      | One vertex per edge (`a--b` / `a->b`). O(E²).                               |
| `contractEdge(g, keep, merge)`                      | Drops loops, keeps first parallel edge.                                     |
| `areIsomorphic(a, b)`, `findGraphIsomorphism(a, b)` | Backtracking on degrees/adjacency, weights ignored; exponential worst case. |

`areIsomorphic` and `findGraphIsomorphism` accept `{ signal }` to cancel long searches.
