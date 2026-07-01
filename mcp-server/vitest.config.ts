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
 * Hardware target: AMD Ryzen 9 9950X3D2 — 16 physical cores, 32 threads,
 * dual-CCD (the stacked V-Cache sits on ONE 8-core CCD). maxThreads = 16
 * (one worker per physical core) so the upgraded box is not left ~50%
 * idle the way the old 8-core default left it. The X3D L3 only makes
 * workers "cache-cheap" on the V-Cache CCD (cores 1–8); cores 9–16 are
 * ordinary Zen5 cores — but a dedicated physical core still beats an idle
 * one, so 16 is the right cap. Past 16 lands two workers on one physical
 * core and they fight the front-end. minThreads = 4 keeps a warm pool for
 * iterative `--watch` work. (Upgraded from 7800X3D 8c/16t after the
 * 2026-06-08 CPU swap; HARDWARE-DRIVE-SYNC-AUDIT-2026-06-08 §3.2.)
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
    // Vitest 4 removed `poolOptions` — maxThreads/minThreads/isolate/singleThread
    // are now TOP-LEVEL `test` options. (Before this migration the whole
    // poolOptions block was silently IGNORED under vitest 4.1.5, so the
    // worker-count tuning had no effect. HARDWARE-DRIVE-SYNC-AUDIT-2026-06-08 §3.2.)
    // 9950X3D2: 16 physical cores; one worker per core.
    // PRISM_VITEST_MAX_THREADS env override available for CI runners
    // that share hosts with other jobs.
    maxThreads: Number(process.env.PRISM_VITEST_MAX_THREADS) || 16,
    minThreads: Number(process.env.PRISM_VITEST_MIN_THREADS) || 4,
    // Keep workers isolated so a test that mutates module-level state
    // (singletons, registries) cannot poison sibling test files.
    isolate: true,
    // Single-thread fallback for debugging: PRISM_VITEST_SINGLE=1 npx vitest run
    singleThread: process.env.PRISM_VITEST_SINGLE === "1",
    // File-level concurrency cap mirrors the worker cap so we don't
    // queue 3400 file-level promises against 16 workers.
    maxConcurrency: 16,
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
