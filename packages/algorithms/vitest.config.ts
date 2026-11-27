import { defineConfig } from 'vitest/config';

const underStryker = process.env.STRYKER_MUTATOR_WORKER !== undefined;
const DEFAULT_TIMEOUT = 5000;
const STRYKER_TIMEOUT = 60_000;

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Stryker's instrumentation and parallel packages make slow tests slower.
    // the 17-vertex exact treewidth run is too slow once Stryker instruments it
    testNamePattern: underStryker ? '^(?!.*too large)' : undefined,
    testTimeout: underStryker ? STRYKER_TIMEOUT : DEFAULT_TIMEOUT,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
