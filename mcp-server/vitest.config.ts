import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: 'H:/prism/.cache/vitest',
  test: {
    include: ['src/__tests__/**/*.test.ts', 'src/knowledge/**/*.test.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    // Share module state across test files within each worker — avoids
    // redundant registry initialization (~3.4s per file × 52 files).
    // Safe because tests are stateless calculations against read-only registries.
    isolate: false,
    pool: 'threads',
    minWorkers: 2,
    maxWorkers: 4, // Reduced from 8: fewer workers = fewer registry initializations
    fileParallelism: true,
    // Cache enabled via --cache CLI flag in package.json "test" script.
    // Caches TS→JS transforms on disk — 89% faster transforms on repeat runs.
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/__tests__/**',
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/**/index.ts',
        'node_modules/**',
      ],
      reporter: ['text', 'json-summary', 'html'],
      reportsDirectory: './coverage',
      // Thresholds — adjust as coverage improves
      thresholds: {
        lines: 50,
        functions: 50,
        branches: 40,
        statements: 50,
      },
    },
  },
});
