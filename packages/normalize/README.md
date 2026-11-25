# @graph-toolkit/normalize

Standardization helpers returning new graphs. Depends on `core`.

## Usage

```ts
import { canonicalize, reindex } from '@graph-toolkit/normalize';

canonicalize(graph); // sorted vertices, ordered endpoints, sorted edges
reindex(graph); // ids "0".."n-1"
```

## API

| Function             | Notes                                                                               |
| -------------------- | ----------------------------------------------------------------------------------- |
| `canonicalize(g)`    | Deterministic order (code-unit comparison); equal graphs yield identical sequences. |
| `relabel(g, rename)` | Throws `GraphError` on id collisions.                                               |
| `reindex(g)`         | Dense numeric ids in vertex order.                                                  |
| `removeSelfLoops(g)` | Drops `v → v` edges.                                                                |

Canonical form is not an isomorphism-invariant labeling: it normalizes representation, not structure. Planned: schema validation.
