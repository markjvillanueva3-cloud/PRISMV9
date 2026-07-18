/**
 * PPG Regression Infrastructure — PPG Test Infrastructure (Part A4)
 *
 * Golden reference management for PPG output stability.
 * Structural snapshots (not byte-exact) that ignore cosmetic differences.
 *
 * Usage:
 *   // In test:
 *   assertMatchesGolden("haas_ngc", "face-mill-4140", actualOutput);
 *
 *   // To update golden refs after intentional changes:
 *   PRISM_UPDATE_GOLDEN=1 npx vitest run ppg-*
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { normalizeGcode } from "./gcode-comparator.js";

// ============================================================================
// CONFIGURATION
// ============================================================================

/** Root directory for golden reference files */
export const GOLDEN_REF_DIR = join(
  import.meta.dirname ?? ".",
  "..",
  "fixtures",
  "golden-references",
);

/** Suite time budget: all PPG tests must complete within 5 minutes */
export const SUITE_TIME_BUDGET_MS = 300_000;

/** Deterministic seed for fuzz tests — always reproducible */
export const FUZZ_SEED = 42;

/** Whether to update golden references (set via env var) */
export const UPDATE_GOLDEN = process.env.PRISM_UPDATE_GOLDEN === "1";

// ============================================================================
// GOLDEN REFERENCE MANAGEMENT
// ============================================================================

function goldenPath(controller: string, program: string): string {
  return join(GOLDEN_REF_DIR, controller, `${program}.nc`);
}

/**
 * Update a golden reference file.
 * Only called when PRISM_UPDATE_GOLDEN=1 is set.
 */
export function updateGoldenRef(controller: string, program: string, output: string): void {
  const path = goldenPath(controller, program);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, normalizeGcode(output), "utf-8");
}

/**
 * Compare actual output against a golden reference.
 * Uses structural comparison (normalizeGcode) — ignores comments, N-numbers, whitespace.
 *
 * If PRISM_UPDATE_GOLDEN=1, updates the reference instead of comparing.
 * If no golden reference exists, creates it (first run).
 */
export function assertMatchesGolden(controller: string, program: string, actual: string): void {
  const path = goldenPath(controller, program);
  const normalizedActual = normalizeGcode(actual);

  if (UPDATE_GOLDEN) {
    updateGoldenRef(controller, program, actual);
    return; // don't fail during update mode
  }

  if (!existsSync(path)) {
    // First run — create baseline
    updateGoldenRef(controller, program, actual);
    console.warn(`[PPG Golden] Created new reference: ${path}`);
    return;
  }

  const expected = readFileSync(path, "utf-8");
  if (normalizedActual !== expected) {
    const actualLines = normalizedActual.split("\n");
    const expectedLines = expected.split("\n");
    const diffs: string[] = [];
    const maxLen = Math.max(actualLines.length, expectedLines.length);

    for (let i = 0; i < maxLen && diffs.length < 15; i++) {
      const a = actualLines[i] ?? "(missing)";
      const e = expectedLines[i] ?? "(missing)";
      if (a !== e) {
        diffs.push(`  L${i + 1}:\n    actual:   ${a}\n    expected: ${e}`);
      }
    }

    const totalDiffs = actualLines.reduce((count, line, i) =>
      count + (line !== expectedLines[i] ? 1 : 0), 0);

    throw new Error(
      `Golden reference mismatch for ${controller}/${program}\n` +
      `  ${totalDiffs} lines differ out of ${maxLen}\n` +
      `  First ${diffs.length} differences:\n${diffs.join("\n")}\n\n` +
      `  To update: PRISM_UPDATE_GOLDEN=1 npx vitest run ppg-*`,
    );
  }
}

// ============================================================================
// QUARANTINE INFRASTRUCTURE
// ============================================================================

export interface QuarantinedTest {
  id: string;
  reason: string;
  date: string;
  controller?: string;
  operation?: string;
}

/**
 * Registry of quarantined tests — real-program tests that fail on
 * parse edge cases get logged as warnings instead of failures.
 */
const QUARANTINE: QuarantinedTest[] = [
  // Add entries here as edge cases are discovered:
  // { id: "real-okuma-3145", reason: "Okuma MIN file uses non-standard G-code", date: "2026-04-07" },
];

export function isQuarantined(testId: string): boolean {
  return QUARANTINE.some(q => q.id === testId);
}

export function getQuarantineReason(testId: string): string | undefined {
  return QUARANTINE.find(q => q.id === testId)?.reason;
}

// ============================================================================
// DETERMINISTIC RANDOM (for fuzz tests)
// ============================================================================

/**
 * Simple seeded PRNG (Mulberry32).
 * Produces deterministic sequences for fuzz testing.
 */
export function createSeededRandom(seed: number = FUZZ_SEED): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a random feed rate within plausible range.
 * Uses seeded random for reproducibility.
 */
export function randomFeed(rng: () => number, min = 50, max = 5000): number {
  return Math.round(min + rng() * (max - min));
}

/**
 * Generate a random RPM within plausible range.
 */
export function randomRPM(rng: () => number, min = 100, max = 15000): number {
  return Math.round(min + rng() * (max - min));
}

// ============================================================================
// TIMING
// ============================================================================

/**
 * Assert a test suite completes within the time budget.
 * Use at the end of a describe block.
 */
export function assertWithinTimeBudget(startTime: number, budgetMs: number = SUITE_TIME_BUDGET_MS): void {
  const elapsed = Date.now() - startTime;
  if (elapsed > budgetMs) {
    throw new Error(
      `PPG suite exceeded time budget: ${elapsed}ms > ${budgetMs}ms (${(elapsed / 1000).toFixed(1)}s)`,
    );
  }
}
