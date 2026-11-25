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

Planned: products, line graph, contraction, isomorphism.
