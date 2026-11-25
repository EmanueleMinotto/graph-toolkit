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

### Validation

```ts
import { assertValidGraph, validateGraph } from '@graph-toolkit/normalize';

validateGraph(graph, {
  directed: false,
  allowSelfLoops: false,
  connected: true,
  weight: { min: 0 },
});
// [] when valid, otherwise [{ code: 'self-loop', message, vertices }, …]
assertValidGraph(graph, schema); // throws ValidationError with `.issues`
```

| Constraint                            | Issue code                            |
| ------------------------------------- | ------------------------------------- |
| `directed`                            | `direction`                           |
| `allowSelfLoops: false`               | `self-loop`                           |
| `allowIsolated: false`                | `isolated-vertex`                     |
| `connected: true` (weak connectivity) | `disconnected`                        |
| `maxVertices`, `maxEdges`             | `too-many-vertices`, `too-many-edges` |
| `vertexIdPattern` (no `g`/`y` flag)   | `vertex-id`                           |
| `weight: { min, max, isInteger }`     | `weight`                              |

Canonical form is not an isomorphism-invariant labeling: it normalizes representation, not structure.
