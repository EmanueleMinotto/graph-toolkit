# @graph-toolkit/web

Browser app to explore graphs, built with React 19, Mantine and Vite, using the `graph-toolkit` facade. Rendering is plain SVG; layouts come from `@graph-toolkit/layout`.

## Run

```sh
pnpm install
pnpm --filter @graph-toolkit/web dev     # http://localhost:5173
pnpm --filter @graph-toolkit/web build   # static site in apps/web/dist
```

## Features

**Build a graph**

- Generate paths, cycles, complete graphs, grids, stars and seeded random graphs, optionally directed; random graphs accept a seed and an edge probability. Sizes up to 2000 vertices (caps per kind).
- Import / export JSON, edge list, DOT, GraphML, GEXF, Mermaid, adjacency CSV and Prüfer codes: paste text then **Import**, **Export current** fills the box, **Upload file** / **Download** use files (the format is guessed from the extension).
- Editor: switch **Edit graph** to _Edit_, then click the canvas to add a vertex and drag from one vertex to another to add an edge (weight and _Allow parallel edges_ are set in the panel). With one or two vertices selected, **Remove vertex**, **Remove edge** and **Set weight on edge** act on them. Manual edits pin every vertex position.
- **Operations**: generate a second graph, then union, intersection, Cartesian/tensor product; or complement, transpose, line graph, induced subgraph, edge contraction, and normalization (canonicalize, reindex, relabel with a prefix, remove self-loops). Results replace the current graph; oversized results are refused.
- **Validate**: check the graph against a schema (direction, self-loops, isolated vertices, connectivity, size limits, id pattern, weight range).

**Look at it**

- Layouts: force-directed, circular, grid, layered. **Undo / Redo** (header) step through up to 50 previous graphs.
- Navigation: mouse wheel zooms around the cursor, dragging the background pans, dragging a vertex moves it (a plain click selects it), **Reset view** restores zoom and positions. Vertices are focusable buttons: Tab to one and press Enter or Space to select it.
- Light and dark themes (follows the system, toggle in the header); the UI meets WCAG 2 A/AA contrast, checked with axe in the e2e tests.

**Analyze it** (Algorithm menu; tools that do not fit the graph are listed but disabled with the reason)

| Group                      | Tools                                                                                                  |
| -------------------------- | ------------------------------------------------------------------------------------------------------ |
| Traversal                  | BFS, DFS                                                                                               |
| Paths                      | Shortest path, Dijkstra, Bellman-Ford, Floyd-Warshall, A\*, k shortest paths                           |
| Trails                     | Eulerian trail, Hamiltonian path and cycle                                                             |
| Structure                  | Connected / strongly connected components, topological order, cycle detection, tree check, bipartition |
| Coloring                   | DSATUR, greedy, exact, edge coloring                                                                   |
| Trees                      | Kruskal, Prim, Borůvka, rooted tree (depth, parent), lowest common ancestor                            |
| Flow and matching          | Max flow (Edmonds–Karp, Dinic), bipartite matching                                                     |
| Centrality and communities | PageRank, degree, closeness, betweenness (vertex size), communities                                    |
| Cliques and planarity      | Maximal / maximum clique, planarity                                                                    |
| Compare                    | Isomorphism with the second graph                                                                      |
| Matrices                   | Adjacency, weighted adjacency, Laplacian, walk counts (adjacency power)                                |

Analyses run in a Web Worker, so heavy (exponential) ones never freeze the page; **Cancel** stops them. Library errors (e.g. MST on a directed graph) are shown as messages. Results appear as a summary, highlighted vertices/edges, sized vertices, a table or a matrix grid.

## Structure

| File                                                | Role                                                            |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `src/tools.ts`                                      | Registry of analysis tools: group, clicks needed, requirements. |
| `src/analysis.ts`, `src/analysis-*.ts`              | The analyses, grouped by topic; each returns a `Highlight`.     |
| `src/use-analysis.ts`, `src/analysis.worker.ts`     | Run an analysis in a Web Worker (inline in jsdom).              |
| `src/formats.ts`, `src/download.ts`                 | Format dispatch tables, samples, file download.                 |
| `src/operations.ts`, `src/validation.ts`            | Pure graph operations and schema validation.                    |
| `src/edit.ts`, `src/use-editor.ts`                  | Pure graph edits and the editing hook.                          |
| `src/use-history.ts`, `src/scene.ts`                | Undo/redo timeline over graph + pinned positions.               |
| `src/layouts.ts`, `src/fit.ts`, `src/viewport.ts`   | Layout choice, fitting to the viewBox, zoom/pan math.           |
| `src/use-graph-interaction.ts`                      | Wheel zoom, pan, vertex dragging, edge drawing.                 |
| `src/App.tsx`, `*Panel.tsx`, `GraphView.tsx`, `...` | UI.                                                             |

To add an analysis: write the function in the matching `analysis-*.ts` (or a new one), add its kind to the `AnalysisKind` union, and add a line to `TOOLS`.

Logic lives in plain modules covered by unit tests; `App.test.tsx` is a jsdom smoke test. End-to-end tests live in `e2e/` (Playwright, run with `pnpm e2e` after `pnpm build`).
