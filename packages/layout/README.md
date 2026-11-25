# @graph-toolkit/layout

Pure, deterministic 2D layouts returning `Map<VertexId, { x, y }>`. Depends on `core`; no DOM.

## Usage

```ts
import { circularLayout, forceLayout } from '@graph-toolkit/layout';

circularLayout(graph, 100); // radius 100 around the origin
forceLayout(graph, { seed: 42, iterations: 300 }); // coordinates in [0, 1]²
```

## API

| Function                                    | Notes                                                                                                                     | Complexity               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| `circularLayout(g, radius?)`                | Even spacing on a circle.                                                                                                 | O(V)                     |
| `gridLayout(g, spacing?)`                   | Row-major, ⌈√V⌉ columns.                                                                                                  | O(V)                     |
| `layeredLayout(g, { layerGap?, nodeGap? })` | DAG longest-path layers (BFS depth otherwise), barycenter ordering, centered layers.                                      | O(V + E) per sweep       |
| `radialLayout(g, { root?, ringGap? })`      | BFS rings around `root`; unreachable vertices on an extra outer ring.                                                     | O(V + E)                 |
| `spectralLayout(g)`                         | Eigenvectors of the Laplacian (2nd and 3rd smallest): similar vertices end up close. Meant for a few hundred vertices.    | O(V³)                    |
| `tutteLayout(g)`                            | Barycentric embedding around an outer cycle: a planar drawing for 3-connected planar graphs; forests fall back to radial. | O(sweeps·E)              |
| `forceLayout(g, options?)`                  | Fruchterman–Reingold; same seed ⇒ same result.                                                                            | O(iterations · (V² + E)) |
