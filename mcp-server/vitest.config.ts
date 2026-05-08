/**
 * Vitest configuration for mcp-server.
 *
 * OBSIDIAN-AUTOMATE-MS3/U-VITEST-PARALLEL
 *
 * Why this exists: mcp-server's test suite is ~3400 cases. Default Vitest
 * concurrency runs file-level workers fine but PRISM had no top-level
 * vitest.config so isolate/pool behaviour was implicit. Pinning the pool
 * and worker counts to the host gives deterministic timing and unlocks
 * the multi-core machine the suite is running on.
 *
 * Hardware target: AMD Ryzen 7 7800X3D — 8 physical cores, 16 threads,
 * very large 96MB L3. The X3D's L3 makes parallel test workers
 * unusually cheap (test working sets stay in cache across forks),
 * so going to maxThreads = 8 (one per physical core) is the right cap;
 * pushing past 8 lands two workers on the same physical core and they
 * fight for the front-end. minThreads = 4 keeps a warm pool for
 * iterative `--watch` work.
 *
 * Pool choice: "threads" (worker_threads) over "forks" because PRISM
 * tests are CPU-bound JS (no native fs locks contended across workers,
 * no per-test process state that leaks). Threads have lower
 * startup cost and share the V8 isolate cache.
 *
 * @milestone OBSIDIAN-AUTOMATE-MS3/U-VITEST-PARALLEL
 */

import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    pool: "threads",
    poolOptions: {
      threads: {
        // 7800X3D: 8 physical cores; one worker per core.
        // PRISM_VITEST_MAX_THREADS env override available for CI runners
        // that share hosts with other jobs.
        maxThreads: Number(process.env.PRISM_VITEST_MAX_THREADS) || 8,
        minThreads: Number(process.env.PRISM_VITEST_MIN_THREADS) || 4,
        // Keep workers isolated so a test that mutates module-level state
        // (singletons, registries) cannot poison sibling test files.
        isolate: true,
        // Single-thread fallback for debugging: PRISM_VITEST_SINGLE=1 npx vitest run
        singleThread: process.env.PRISM_VITEST_SINGLE === "1",
      },
    },
    // File-level concurrency cap mirrors the worker cap so we don't
    // queue 3400 file-level promises against 8 workers.
    maxConcurrency: 8,
    // Fail fast in CI; locally vitest still reports all failures.
    bail: process.env.CI === "true" ? 1 : 0,
    // 30s per-test default (network/Ollama tests have their own AbortController timeouts).
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Reporters: default for humans, json + junit for CI artifact harvesting.
    reporters: process.env.CI === "true"
      ? ["default", "junit"]
      : ["default"],
    outputFile: process.env.CI === "true"
      ? { junit: "test-results/junit.xml" }
      : undefined,
  },
});
