import { defineConfig } from 'vitest/config';

const DEFAULT_TIMEOUT = 5000;
const STRYKER_TIMEOUT = 60_000;

export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
    // Stryker's instrumentation and parallel packages make slow tests slower.
    testTimeout:
      process.env.STRYKER_MUTATOR_WORKER === undefined ? DEFAULT_TIMEOUT : STRYKER_TIMEOUT,
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/index.ts'],
      thresholds: { statements: 100, branches: 100, functions: 100, lines: 100 },
    },
  },
});
