# @graph-toolkit/layout

Pure, deterministic 2D layouts returning `Map<VertexId, { x, y }>`. Depends on `core`; no DOM.

## Usage

```ts
import { circularLayout, forceLayout } from '@graph-toolkit/layout';

circularLayout(graph, 100); // radius 100 around the origin
forceLayout(graph, { seed: 42, iterations: 300 }); // coordinates in [0, 1]²
```

## API

| Function                     | Notes                                          | Complexity               |
| ---------------------------- | ---------------------------------------------- | ------------------------ |
| `circularLayout(g, radius?)` | Even spacing on a circle.                      | O(V)                     |
| `gridLayout(g, spacing?)`    | Row-major, ⌈√V⌉ columns.                       | O(V)                     |
| `forceLayout(g, options?)`   | Fruchterman–Reingold; same seed ⇒ same result. | O(iterations · (V² + E)) |

Planned: hierarchical (layered) layout.
