import fc from 'fast-check';

/** Stryker sets `STRYKER_MUTATOR_WORKER` in its test-runner processes. */
export const UNDER_STRYKER: boolean =
  process.env['STRYKER_MUTATOR_WORKER'] !== undefined ||
  process.env['STRYKER_MUTATOR_RUNNER'] !== undefined;

const MUTATION_RUNS = 20;
const MUTATION_SEED = 1;
const DEFAULT_RUNS = 100;
const BRUTE_FORCE_RUNS = 200;

const reproduction = (details: fc.RunDetails<unknown>): string =>
  `${fc.defaultReportMessage(details) ?? 'property failed'}\n` +
  `Reproduce with fc.assert(property, { seed: ${String(details.seed)}, path: ${JSON.stringify(details.counterexamplePath)} })`;

/**
 * Global defaults, applied by `setup.ts`. Seeds stay random so CI keeps exploring (a failure
 * prints its seed and path); under Stryker the seed is pinned and runs are cut to avoid flakiness.
 */
export const globalParameters = (): fc.GlobalParameters => ({
  numRuns: UNDER_STRYKER ? MUTATION_RUNS : DEFAULT_RUNS,
  endOnFailure: false,
  ...(UNDER_STRYKER && { seed: MUTATION_SEED }),
  // `plugins` is not accepted by `configureGlobal`, so the (deprecated) global reporter it is.
  // eslint-disable-next-line @typescript-eslint/no-deprecated
  reporter: (details) => {
    if (details.failed) {
      throw new Error(reproduction(details));
    }
  },
});

/** Parameters for properties checked against an exhaustive oracle: more runs than the default. */
export const BRUTE_FORCE: fc.Parameters<unknown> = {
  numRuns: UNDER_STRYKER ? MUTATION_RUNS : BRUTE_FORCE_RUNS,
};
