import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: { include: ['src/**/*.bench.ts'], testTimeout: 300_000, hookTimeout: 120_000 },
});
