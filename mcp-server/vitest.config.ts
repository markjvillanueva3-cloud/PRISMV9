// vitest.config.ts — INTEL-OLLAMA-OBSIDIAN-MS0/P9-U01
//
// Disables cross-file parallelism so tests that read/write the same
// state/shared/*.json fixture paths (QUALITY_SCORES.json, SVI.json,
// FORMULA_ACCURACY.json, SELF_IMPROVEMENT_PATTERNS.json, AUTO_FIX_*.json,
// failure_patterns.jsonl, etc.) don't stomp each other.
//
// Within-file tests still run sequentially (vitest default). Cross-file
// parallelism gives a small wall-clock win but caused EPERM unlinks and
// undefined-pattern reads when AUTO/Quality/SVI tests overlapped on the
// same fixture filesystem.
//
// All other vitest defaults are preserved.

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
  },
});
