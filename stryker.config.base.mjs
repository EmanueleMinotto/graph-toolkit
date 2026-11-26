// Shared Stryker settings: each package re-exports this from its own stryker.config.mjs.
/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  // pnpm's strict node_modules hides the default `@stryker-mutator/*` glob.
  plugins: ['@stryker-mutator/vitest-runner', '@stryker-mutator/typescript-checker'],
  testRunner: 'vitest',
  checkers: ['typescript'],
  tsconfigFile: 'tsconfig.json',
  coverageAnalysis: 'perTest',
  mutate: ['src/**/*.ts', '!src/**/*.test.ts', '!src/index.ts'],
  incremental: true,
  incrementalFile: '.stryker-tmp/incremental.json',
  reporters: ['clear-text', 'progress', 'html'],
  htmlReporter: { fileName: 'reports/mutation/index.html' },
  // Start permissive: tighten `break` per package once real scores are known.
  thresholds: { high: 80, low: 60, break: null },
};
