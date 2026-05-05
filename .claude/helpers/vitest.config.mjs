import { defineConfig } from "vitest/config";

// Local config for the scrutiny-ledger + helper-script tests. Kept separate
// from mcp-server/vitest.config.ts because the helpers under .claude/ are
// .mjs and live outside the mcp-server src tree. Run with:
//   node mcp-server/node_modules/vitest/vitest.mjs run --config .claude/helpers/vitest.config.mjs
export default defineConfig({
  test: {
    include: ["**/*.test.mjs"],
    environment: "node",
    testTimeout: 15000,
    isolate: true,
  },
});
