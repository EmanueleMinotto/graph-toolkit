# @graph-toolkit/web

Browser app to explore graphs, built with React 19 + Vite and the `graph-toolkit` facade. Rendering is plain SVG; layouts come from `@graph-toolkit/layout`.

## Run

```sh
pnpm install
pnpm --filter @graph-toolkit/web dev     # http://localhost:5173
pnpm --filter @graph-toolkit/web build   # static site in apps/web/dist
```

## Features

- Generate cycles, complete graphs, grids, stars and seeded random graphs.
- Import / export JSON, edge list, DOT, GraphML, GEXF and adjacency CSV (paste text, then **Import**; **Export current** fills the box).
- Layouts: force-directed, circular, grid.
- Navigation: mouse wheel zooms around the cursor, dragging the background pans, dragging a vertex moves it (a plain click still selects it), **Reset view** restores zoom and positions.
- Analyses: BFS order, shortest path (click a start and a target vertex), DSATUR coloring, minimum spanning tree. Library errors (e.g. MST on a directed graph) are shown as messages.

## Structure

| File                                           | Role                                       |
| ---------------------------------------------- | ------------------------------------------ |
| `src/formats.ts`                               | Format dispatch tables and sample graphs.  |
| `src/analysis.ts`                              | Runs algorithms and returns a `Highlight`. |
| `src/fit.ts`                                   | Scales a layout into the SVG viewBox.      |
| `src/viewport.ts`                              | Pure zoom/pan math.                        |
| `src/use-graph-interaction.ts`                 | Hook: wheel zoom, pan and vertex dragging. |
| `src/App.tsx`, `Controls.tsx`, `GraphView.tsx` | UI.                                        |

Logic lives in plain modules covered by unit tests; `App.test.tsx` is a jsdom smoke test. End-to-end tests live in `e2e/` (Playwright, run with `pnpm e2e` after `pnpm build`).
