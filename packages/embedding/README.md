# @graph-sdk/embedding

Vertex embeddings. Depends on `core` and `matrix`.

## Usage

```ts
import { randomWalks, spectralEmbedding } from '@graph-sdk/embedding';

randomWalks(graph, { walksPerVertex: 10, length: 40, seed: 1 }); // VertexId[][] for skip-gram training
spectralEmbedding(graph, { dimensions: 2 }); // Map<VertexId, [x, y]> from the Laplacian eigenvectors
```

## API

| Function                         | Notes                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------- |
| `randomWalks(g, options?)`       | Seeded uniform or weighted walks over outgoing edges; ends early at a sink.           |
| `spectralEmbedding(g, options?)` | Laplacian eigenmaps, dense $O(n^3)$: up to a few hundred vertices, undirected graphs. |

## Limits

- No skip-gram training: feed the walks to your own word2vec implementation.
- No node2vec return/in-out bias (`p`, `q`): walks are first-order.
- On a disconnected graph or with a repeated eigenvalue the spectral axes are not unique.
