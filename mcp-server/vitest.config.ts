import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    // Share module state across test files within each worker — avoids
    // redundant registry initialization (~3.4s per file × 52 files).
    // Safe because tests are stateless calculations against read-only registries.
    isolate: false,
    pool: 'threads',
    poolOptions: {
      threads: {
        minThreads: 2,
        maxThreads: 4, // Reduced from 8: fewer threads = fewer registry initializations
      },
    },
    fileParallelism: true,
  },
});
