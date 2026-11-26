# @graph-sdk/coloring

Vertex coloring for undirected, loop-free graphs. Colors are integers starting at 0. Depends on `core`.

## Usage

```ts
import { cycleGraph } from '@graph-sdk/generators';
import { bipartition, dsaturColoring } from '@graph-sdk/coloring';

const coloring = dsaturColoring(cycleGraph(5));
coloring.colorCount; // 3
bipartition(cycleGraph(5)); // undefined (odd cycle)
```

## API

| Function                        | Notes                                                        | Complexity          |
| ------------------------------- | ------------------------------------------------------------ | ------------------- |
| `greedyColoring(g, order?)`     | Default Welsh–Powell order; ≤ $\Delta + 1$ colors.           | $O(V + E)$          |
| `dsaturColoring(g)`             | Saturation-degree heuristic.                                 | $O(V \cdot E)$      |
| `bipartition(g)`                | 2-coloring or `undefined`.                                   | $O(V + E)$          |
| `isProperColoring(g, coloring)` | Validity check.                                              | $O(E)$              |
| `exactColoring(g)`              | Chromatic number by backtracking; exponential, keep V small. | exponential         |
| `edgeColoring(g)`               | Greedy proper edge coloring, ≤ $2\Delta - 1$ colors.         | $O(E \cdot \Delta)$ |

Directed graphs and self-loops throw `GraphError`.
