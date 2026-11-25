# Contributing

- Commits: Conventional Commits (enforced by commitlint). Work lands on `main`; CI must be green before the next step.
- Style: Prettier + ESLint (`--max-warnings 0`). Object-calisthenics-inspired limits: depth ≤ 2, ≤ 3 parameters, functions ≤ 20 lines, files ≤ 150 lines, complexity ≤ 6, no `else`, no `switch`, no getters/setters.
- Public API is immutable. Mutation is allowed only inside `src/internal/**` (and `*-builder.ts` accumulators), where hot loops use typed arrays and indexed `for`. Internals are never re-exported.
- Every package keeps 100% test coverage, a README with examples, and TSDoc on every public export.
- Scope: `@graph-toolkit/<name>`; dependencies between packages must follow [docs/architecture.md](docs/architecture.md) and stay acyclic (`import-x/no-cycle`, pnpm strict `node_modules`).

## Docs, benchmarks and releases

- `pnpm docs:api` builds the TypeDoc API reference into `docs/api` (git-ignored; published to GitHub Pages by `.github/workflows/pages.yml`).
- `apps/benchmarks` holds performance budget tests (run with the normal test task) and an on-demand `bench` script.
- Releases use Changesets: add a note with `pnpm changeset`. On `main`, `.github/workflows/release.yml` opens a "version packages" pull request; merging it publishes to npm with provenance (inactive until the `NPM_TOKEN` repository secret exists; the repository must also allow GitHub Actions to create pull requests, under Settings → Actions → General).
- CI also checks package exports with publint and Are the Types Wrong (`attw`), enforces 100% test coverage in every library package and uploads the coverage reports as an artifact.
- `pnpm --filter @graph-toolkit/web e2e` runs the Playwright end-to-end tests against `vite preview` (build first; run `pnpm --filter @graph-toolkit/web exec playwright install` once (Chromium, Firefox, WebKit)).
