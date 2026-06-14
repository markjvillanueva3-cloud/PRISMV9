import { defineConfig } from 'vitest/config';

// Runs the scripts/ test suite (*.test.mjs) — the root vitest.config.ts only includes
// src/__tests__/**/*.test.ts, so script-level utilities (winmax-ui-map, winmax-autotest,
// prism-base-job, units-guard, ...) need this config. Run:
//   npx vitest run --config scripts/vitest.config.mjs
export default defineConfig({
  test: {
    include: ['**/*.test.mjs'],
    globals: true,
    environment: 'node',
    testTimeout: 30000,
  },
});
