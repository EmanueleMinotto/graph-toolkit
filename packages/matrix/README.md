# @graph-sdk/matrix

Matrix representations of graphs and basic dense matrix algebra. Depends on `core`.

## Usage

```ts
import { cycleGraph } from '@graph-sdk/generators';
import { adjacencyMatrix, laplacianMatrix } from '@graph-sdk/matrix';

const a = adjacencyMatrix(cycleGraph(4));
a.power(2).get(0, 0); // 2 closed walks of length 2 at vertex 0
laplacianMatrix(cycleGraph(4)).toRows(); // each row sums to 0
```

## API

| Export                                   | Notes                                                                           |
| ---------------------------------------- | ------------------------------------------------------------------------------- |
| `Matrix`                                 | Immutable dense matrix: `get`, `toRows`, `multiply` O(n³), `power` O(n³ log k). |
| `adjacencyMatrix(g, { isWeighted? })`    | Vertex insertion order; entries 1 or edge weights.                              |
| `laplacianMatrix(g, { isWeighted? })`    | L = D − A, undirected only.                                                     |
| `graphFromAdjacency(m, { isDirected? })` | Vertices `"0"`..`"n-1"`; undirected input must be symmetric.                    |

Planned: incidence matrix, spectrum (eigenvalues).

## Incidence matrix and spectrum

- `incidenceMatrix(graph)`: vertices × edges (columns follow `graph.edges()`); directed arcs use −1 at the source, +1 at the target.
- `eigenvalues(matrix)`: ascending eigenvalues of a symmetric matrix (Jacobi method).
- `adjacencySpectrum(graph)`, `laplacianSpectrum(graph)`, `algebraicConnectivity(graph)`: spectral graph measures (Fiedler value is 0 iff the graph is disconnected).
- `eigenDecomposition(matrix)`: ascending eigenvalues with their unit eigenvectors (`vectors[i]` belongs to `values[i]`).
