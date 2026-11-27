# Contributing

- Commits: Conventional Commits (enforced by commitlint). Work lands on `main`; CI must be green before the next step.
- Style: Prettier + ESLint (`--max-warnings 0`). Object-calisthenics-inspired limits: depth ≤ 2, ≤ 3 parameters, functions ≤ 20 lines, files ≤ 150 lines, complexity ≤ 6, no `else`, no `switch`, no getters/setters.
- Public API is immutable. Mutation is allowed only inside `src/internal/**` (and `*-builder.ts` accumulators), where hot loops use typed arrays and indexed `for`. Internals are never re-exported.
- Every package keeps 100% test coverage, a README with examples, and TSDoc on every public export.
- Scope: `@graph-sdk/<name>`; dependencies between packages must follow [docs/architecture.md](docs/architecture.md) and stay acyclic (`import-x/no-cycle`, pnpm strict `node_modules`).

## Property-based tests

- Shared arbitraries live in the private `@graph-sdk/test-utils` package (never published): `arbGraph`, `arbConnectedGraph`, `arbDag`, `arbTree`, `arbPermutation`, plus `relabel` for "renaming vertices does not change the result" properties. Graphs are built through `GraphBuilder`, small (n ≤ 8 by default). Add `"@graph-sdk/test-utils": "workspace:*"` and `fast-check` to a package's `devDependencies` to use them (`@graph-sdk/core` tests import the source by relative path to avoid a dependency cycle).
- Name property files `<area>.properties.test.ts`. Every package's `vitest.config.ts` loads `../test-utils/src/setup.ts`, which sets 100 runs per property, `endOnFailure: false` and a failure message with seed and path. Use `{ ...BRUTE_FORCE }` (200 runs) for properties checked against an exhaustive oracle.
- Seeds are random on every run, in CI too, so exploration continues. Under Stryker (`STRYKER_MUTATOR_WORKER`) runs drop to 20 and the seed is pinned.
- Reproduce a failure by pasting the printed values: `fc.assert(property, { seed, path })`.
- Prefer a property over an example when the rule holds for every input (round trips, idempotence, invariants, agreement with a brute-force oracle, renaming vertices); keep an example for a specific edge case or a regression.

## Docs, benchmarks and releases

- Write formulas and complexities as math: `$O(V + E)$` inline, `$$...$$` for blocks. GitHub renders it in READMEs; the API reference loads MathJax (`docs/theme/mathjax.js`) for the same delimiters in TSDoc.
- `pnpm docs:api` builds the TypeDoc API reference into `docs/api` (git-ignored; published to GitHub Pages by `.github/workflows/pages.yml`).
- `apps/benchmarks` holds performance budget tests (run with the normal test task) and an on-demand `bench` script.
- Releases use Changesets: add a note with `pnpm changeset`. On `main`, `.github/workflows/release.yml` opens a "version packages" pull request; merging it publishes to npm with provenance (inactive until the `NPM_TOKEN` repository secret exists; the repository must also allow GitHub Actions to create pull requests, under Settings → Actions → General).
- CI also checks package exports with publint and Are the Types Wrong (`attw`), enforces 100% test coverage in every library package and uploads the coverage reports as an artifact.
- `pnpm --filter @graph-sdk/web e2e` runs the Playwright end-to-end tests against `vite preview` (build first; run `pnpm --filter @graph-sdk/web exec playwright install` once (Chromium, Firefox, WebKit)).
