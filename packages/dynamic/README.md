# @graph-sdk/dynamic

Diffs, patches and undo/redo for graphs that evolve. Depends on `core` only.

## Usage

```ts
import {
  applyDiff,
  commit,
  createHistory,
  diffGraphs,
  invertDiff,
  redo,
  undo,
} from '@graph-sdk/dynamic';

const diff = diffGraphs(before, after); // added/removed vertices and edges, reweighted edges
applyDiff(before, diff); // a graph equal to `after`
applyDiff(after, invertDiff(diff)); // back to `before`

let history = createHistory(initial);
history = commit(history, next);
history = undo(history); // history.current is `initial`
history = redo(history); // history.current is `next`
```

## Limits

- Vertex and edge attributes are ignored by `diffGraphs` and not set on what `applyDiff` adds.
- Parallel edges collapse onto one: use simple graphs.
- Diffing graphs of different direction throws `GraphError`.
