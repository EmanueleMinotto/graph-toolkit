# graph-toolkit

Single entry point re-exporting every `@graph-sdk/*` package: core model, math structures, matrices, operations, traversal, paths and cycles, trees, coloring, algorithms, generators, normalization, import/export and layouts.

```ts
import { cycleGraph, dijkstra, toDot } from 'graph-toolkit';

const graph = cycleGraph(5);
dijkstra(graph, graph.vertices()[0]!).distanceTo(graph.vertices()[2]!); // 2
toDot(graph);
```

Prefer the individual packages when bundle size matters; see the [root README](../../README.md) for the list.
