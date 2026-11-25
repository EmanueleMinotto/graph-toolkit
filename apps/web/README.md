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

- Generate paths, cycles, complete graphs, grids, stars, wheels, binary trees, hypercubes, the Petersen graph and seeded random, scale-free (Barabási–Albert) and small-world (Watts–Strogatz) graphs, optionally directed; seeded kinds accept a seed, random graphs also an edge probability. Sizes up to 2000 vertices (caps per kind).
- **Examples**: eleven ready-made graphs (Petersen, K3,3, a flow network, a course DAG, a road map, …), each chosen to show a tool.
- Import / export JSON, edge list, DOT, GraphML, GEXF, GML, graph6, sparse6, Pajek, DIMACS, Mermaid, adjacency CSV and Prüfer codes: paste text then **Import**, **Export current** fills the box, **Upload file** / **Download** use files (the format is guessed from the extension).
- Editor: switch **Edit graph** to _Edit_, then click the canvas to add a vertex and drag from one vertex to another to add an edge (weight and _Allow parallel edges_ are set in the panel). With one or two vertices selected, **Remove vertex**, **Remove edge** and **Set weight on edge** act on them. Manual edits pin every vertex position.
- **Operations**: generate a second graph, then union, intersection, Cartesian/tensor product; or complement, transpose, line graph, induced subgraph, edge contraction, and normalization (canonicalize, reindex, relabel with a prefix, remove self-loops). Results replace the current graph; oversized results are refused.
- **Validate**: check the graph against a schema (direction, self-loops, isolated vertices, connectivity, size limits, id pattern, weight range).

**Look at it**

- Layouts: force-directed, circular, grid, layered, radial, spectral (up to 200 vertices) and Tutte (planar drawings of 3-connected planar graphs). **Undo / Redo** (header) step through up to 50 previous graphs.
- Navigation: mouse wheel zooms around the cursor, dragging the background pans, dragging a vertex moves it (a plain click selects it), **Reset view** restores zoom and positions. Vertices are focusable buttons: Tab to one and press Enter or Space to select it. **Shift+click** builds a group: drag one member to move them all, **Delete** removes the group, **Escape** clears it. Graphs over 300 vertices are drawn on a WebGL canvas (edges, arrowheads and vertices in a few draw calls) with the SVG on top for clicks and dragging. Selected and grouped vertices are always real SVG; once 150 or fewer vertices are on screen (zoom in) they all are, so labels and Tab focus return. Without WebGL the app draws only what is near the screen as SVG.
- Sidebar sections are collapsible and sortable (drag the grip on the left, or focus it, press Space and use the arrow keys). Which ones are open and in what order is remembered in the browser (`localStorage`, keys `graph-toolkit.open-panels` and `graph-toolkit.panel-order`). Every choice list is a Mantine Combobox with an icon per option, grouped where it helps (the Algorithm list is also searchable).
- **Save and share**: the graph is kept in the browser and mirrored in the address bar (`#g=…`, when short enough); the link button in the header copies a URL that reopens it. **Export SVG** / **Export PNG** save the picture as drawn.
- Interface language: English or Italian (follows the browser, switch in the header). Algorithm names, groups, examples and result summaries are translated too; tables show vertex ids and numbers as they are.
- Installable and usable offline after the first visit (web app manifest and a small service worker).
- Light and dark themes (follows the system, toggle in the header); the UI meets WCAG 2 A/AA contrast, checked with axe in the e2e tests.

**Analyze it** (Algorithm menu; tools that do not fit the graph are listed but disabled with the reason)

| Group                      | Tools                                                                                                                                                                                             |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Traversal                  | BFS, DFS                                                                                                                                                                                          |
| Paths                      | Shortest path, Dijkstra, Bellman-Ford, Floyd-Warshall, Johnson, DAG distances, A\*, k shortest paths                                                                                              |
| Trails                     | Eulerian trail, Hamiltonian path and cycle                                                                                                                                                        |
| Structure                  | Components (connected, strong, biconnected), bridges, articulation points, k-cores, clustering, diameter, treewidth bound, transitive closure, topological order, cycles, tree check, bipartition |
| Coloring                   | DSATUR, greedy, exact, edge coloring                                                                                                                                                              |
| Trees                      | Kruskal, Prim, Borůvka, minimum arborescence, Steiner tree, rooted tree (depth, parent), lowest common ancestor                                                                                   |
| Flow and matching          | Max flow (Edmonds–Karp, Dinic), minimum cut, bipartite and general (blossom) matching                                                                                                             |
| Centrality and communities | PageRank, degree, closeness, betweenness (vertex size), communities                                                                                                                               |
| Cliques and planarity      | Maximal / maximum clique, planarity                                                                                                                                                               |
| Compare                    | Isomorphism with the second graph                                                                                                                                                                 |
| Matrices                   | Adjacency, weighted adjacency, Laplacian, spectrum, walk counts (adjacency power)                                                                                                                 |

BFS, DFS, the distance tools and the spanning-tree tools can be **animated**: press play (or drag the step slider) to watch vertices and edges appear in the order the algorithm found them.

Analyses run in a Web Worker, so heavy (exponential) ones never freeze the page; **Cancel** stops them. Library errors (e.g. MST on a directed graph) are shown as messages. Results appear as a summary, highlighted vertices/edges, sized vertices, a table or a matrix grid.

## Structure

| File                                                         | Role                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------- |
| `src/tools.ts`                                               | Registry of analysis tools: group, clicks needed, requirements. |
| `src/analysis.ts`, `src/analysis-*.ts`                       | The analyses, grouped by topic; each returns a `Highlight`.     |
| `src/use-analysis.ts`, `src/analysis.worker.ts`              | Run an analysis in a Web Worker (inline in jsdom).              |
| `src/formats.ts`, `src/samples.ts`, `src/examples.ts`        | Format dispatch tables, generators, ready-made examples.        |
| `src/persistence.ts`, `src/export-image.ts`, `src/i18n.ts`   | Save/share links, SVG/PNG export, interface translations.       |
| `src/playback.ts`, `src/use-playback.ts`, `src/use-group.ts` | Step-by-step animation and Shift+click groups.                  |
| `src/operations.ts`, `src/validation.ts`                     | Pure graph operations and schema validation.                    |
| `src/edit.ts`, `src/use-editor.ts`                           | Pure graph edits and the editing hook.                          |
| `src/use-history.ts`, `src/scene.ts`                         | Undo/redo timeline over graph + pinned positions.               |
| `src/layouts.ts`, `src/fit.ts`, `src/viewport.ts`            | Layout choice, fitting to the viewBox, zoom/pan math.           |
| `src/use-graph-interaction.ts`                               | Wheel zoom, pan, vertex dragging, edge drawing.                 |
| `src/choices.ts`, `src/icons.ts`, `ChoiceSelect.tsx`         | Option lists (labels, groups, icons) and the combobox.          |
| `src/App.tsx`, `*Panel.tsx`, `GraphView.tsx`, `...`          | UI.                                                             |

To add an analysis: write the function in the matching `analysis-*.ts` (or a new one), add its kind to the `AnalysisKind` union, and add a line to `TOOLS`.

Logic lives in plain modules covered by unit tests; `App.test.tsx` is a jsdom smoke test. End-to-end tests live in `e2e/` (Playwright, run with `pnpm e2e` after `pnpm build`).

Browsers: the e2e suite runs in Chromium, Firefox and WebKit (`pnpm exec playwright install` once). Screenshot comparisons in `e2e/visual.spec.ts` run only with `VISUAL=1` (the `visual` CI job does this). Baselines are per platform (`*-linux.png` are committed); to refresh them, run the job, download its `visual-baselines` artifact and replace the files.
