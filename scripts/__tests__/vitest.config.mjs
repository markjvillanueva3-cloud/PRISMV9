import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Local config for the scripts/__tests__/*.test.mjs suite. Same pattern as the
// .claude/hooks/__tests__ config — pins root to this directory so the include
// glob can't widen to the whole repo when invoked from the repo root.
//
// Run from anywhere with:
//   node mcp-server/node_modules/vitest/vitest.mjs run \
//        --config scripts/__tests__/vitest.config.mjs

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    root: here,
    include: ["*.test.mjs"],
    environment: "node",
    testTimeout: 15000,
    globals: false,
  },
});
