// tier: T0
import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

// Local config for the .claude/hooks/__tests__/*.test.mjs suite. Same pattern
// as .claude/helpers/vitest.config.mjs — `root` is pinned to this directory so
// the `include` glob can't widen to the whole repo (or worktrees) when invoked
// from the repo root.
//
// Run from anywhere with:
//   node mcp-server/node_modules/vitest/vitest.mjs run \
//        --config .claude/hooks/__tests__/vitest.config.mjs
//
// Or to run a single file:
//   node mcp-server/node_modules/vitest/vitest.mjs run \
//        --config .claude/hooks/__tests__/vitest.config.mjs \
//        hook-cross-worktree-block.test.mjs

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
