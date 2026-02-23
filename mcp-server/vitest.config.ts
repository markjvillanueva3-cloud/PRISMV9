import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['src/__tests__/**/*.test.ts'],
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      reportsDirectory: './coverage',
      include: ['src/**/*.ts'],
      exclude: [
        'src/__tests__/**',
        'src/types/**',
        'node_modules/**',
      ],
      // Baseline (R12-MS4): lines 0.4%, branches 0.3%, functions 0.3%
      // Thresholds intentionally unset — coverage is tracked, not gated.
      // Target: lines >5% by R13, >20% by R14.
    },
  },
});
