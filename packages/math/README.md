# @graph-sdk/math

Data structures shared by graph algorithms. No dependencies.

## Usage

```ts
import { DisjointSet, MinPriorityQueue } from '@graph-sdk/math';

const queue = new MinPriorityQueue();
queue.push(7, 2.5);
queue.push(3, 1);
queue.pop(); // { item: 3, priority: 1 }

const sets = new DisjointSet(4);
sets.union(0, 1); // true
sets.find(0) === sets.find(1); // true
sets.setCount(); // 3
```

## API

| Export             | Notes                                                                      |
| ------------------ | -------------------------------------------------------------------------- |
| `MinPriorityQueue` | Binary heap; `push`, `pop` $O(\log n)$, `size` $O(1)$. Duplicates allowed. |
| `DisjointSet`      | Union-find, union by rank + path compression; `find`, `union`, `setCount`. |
| `mulberry32`       | `mulberry32(seed)` returns a seeded generator of floats in [0, 1).         |
