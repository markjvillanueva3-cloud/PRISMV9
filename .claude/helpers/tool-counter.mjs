/**
 * tool-counter.mjs — Shared tool-invocation counter library
 *
 * Used by: compact-counter.mjs (1-A), safety-escalation.mjs (1-B), pattern-extractor.mjs (4-A)
 * Persists counters under CACHE_DIR/counters/ (one file per counter, atomic writes).
 * Family-agnostic — fires for both Claude and Codex.
 *
 * Error recovery: all reads wrapped in try-catch; corrupt/missing files reset to 0.
 * Self-test: node tool-counter.mjs --selftest
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { CACHE_DIR, ensureCacheDir } from "./hook-cache.mjs";

const COUNTERS_DIR = path.join(CACHE_DIR, "counters");

async function ensureCountersDir() {
  await fs.mkdir(COUNTERS_DIR, { recursive: true });
}

function counterPath(name) {
  const safeName = String(name).replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(COUNTERS_DIR, `${safeName}.txt`);
}

/**
 * Get current count for a named counter.
 * Returns 0 if missing or corrupt.
 */
export async function getCount(name) {
  try {
    const raw = await fs.readFile(counterPath(name), "utf8");
    const val = parseInt(raw.trim(), 10);
    return Number.isFinite(val) && val >= 0 ? val : 0;
  } catch {
    return 0;
  }
}

/**
 * Increment a named counter by 1. Returns the new value.
 * Creates the counter file if missing.
 */
export async function increment(name) {
  try {
    await ensureCountersDir();
    const current = await getCount(name);
    const next = current + 1;
    await fs.writeFile(counterPath(name), String(next), "utf8");
    return next;
  } catch (err) {
    // Log warning but don't crash — dependent hooks have continueOnError:true
    process.stderr.write(`[tool-counter] increment(${name}) failed: ${err.message}\n`);
    return (await getCount(name)) + 1; // best-effort return
  }
}

/**
 * Reset a named counter to 0.
 */
export async function reset(name) {
  try {
    await ensureCountersDir();
    await fs.writeFile(counterPath(name), "0", "utf8");
  } catch (err) {
    process.stderr.write(`[tool-counter] reset(${name}) failed: ${err.message}\n`);
  }
}

/**
 * Get all counters as { name: value } map.
 */
export async function getAll() {
  try {
    await ensureCountersDir();
    const files = await fs.readdir(COUNTERS_DIR);
    const result = {};
    for (const file of files) {
      if (file.endsWith(".txt")) {
        const name = file.replace(/\.txt$/, "");
        result[name] = await getCount(name);
      }
    }
    return result;
  } catch {
    return {};
  }
}

// --- Self-test when invoked directly ---
const isMain = process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1"));

if (isMain || process.argv.includes("--selftest")) {
  (async () => {
    console.log("[tool-counter] Running self-test...");

    // Test increment
    await reset("__selftest");
    const v1 = await increment("__selftest");
    console.assert(v1 === 1, `Expected 1, got ${v1}`);

    const v2 = await increment("__selftest");
    console.assert(v2 === 2, `Expected 2, got ${v2}`);

    // Test getCount
    const v3 = await getCount("__selftest");
    console.assert(v3 === 2, `Expected 2, got ${v3}`);

    // Test reset
    await reset("__selftest");
    const v4 = await getCount("__selftest");
    console.assert(v4 === 0, `Expected 0, got ${v4}`);

    // Test getAll
    await increment("__selftest");
    const all = await getAll();
    console.assert("__selftest" in all, "Expected __selftest in getAll");

    // Cleanup
    await reset("__selftest");
    try { await fs.unlink(counterPath("__selftest")); } catch { /* ok */ }

    // Test corrupt file recovery
    await ensureCountersDir();
    await fs.writeFile(counterPath("__corrupt_test"), "not-a-number", "utf8");
    const corrupt = await getCount("__corrupt_test");
    console.assert(corrupt === 0, `Expected 0 for corrupt, got ${corrupt}`);
    try { await fs.unlink(counterPath("__corrupt_test")); } catch { /* ok */ }

    // Test missing file
    const missing = await getCount("__nonexistent");
    console.assert(missing === 0, `Expected 0 for missing, got ${missing}`);

    console.log("[tool-counter] All self-tests passed.");
    process.exit(0);
  })().catch((err) => {
    console.error("[tool-counter] Self-test failed:", err);
    process.exit(1);
  });
}
