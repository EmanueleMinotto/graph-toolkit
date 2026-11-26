# @graph-sdk/generators

Graph generators. Vertices are named `"0"`..`"n-1"`. Pass `{ directed: true }` for directed variants (edges follow the pair order).

## Usage

```ts
import { cycleGraph, randomGraph } from '@graph-sdk/generators';

cycleGraph(5).edgeCount; // 5
randomGraph(100, { probability: 0.05, seed: 42 }); // same graph for the same seed
```

## API

| Function                                             | Result                                         |
| ---------------------------------------------------- | ---------------------------------------------- |
| `pathGraph(n)`, `cycleGraph(n)`                      | Path / cycle (cycle with n < 3 is a path)      |
| `completeGraph(n)`, `starGraph(n)`                   | K_n / star with centre `"0"`                   |
| `gridGraph(rows, columns)`                           | 4-neighbour lattice                            |
| `randomGraph(n, p, seed)`                            | Erdős–Rényi G(n, p), Mulberry32 PRNG, $O(n^2)$ |
| `wheelGraph(n)`, `hypercubeGraph(d)`                 | Wheel (hub `"0"`) / hypercube Q_d              |
| `completeBipartiteGraph(a, b)`, `binaryTreeGraph(n)` | K_{a,b} / heap-ordered binary tree             |
| `petersenGraph()`                                    | The Petersen graph (3-regular, 10 vertices)    |
| `randomGraphWithEdges(n, { edges, seed })`           | Erdős–Rényi G(n, m), exactly m edges           |
| `barabasiAlbertGraph(n, { attach, seed })`           | Preferential attachment (scale-free)           |
| `wattsStrogatzGraph(n, { neighbors, beta, seed })`   | Small-world ring with rewiring                 |
