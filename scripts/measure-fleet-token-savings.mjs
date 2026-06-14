#!/usr/bin/env node
/**
 * measure-fleet-token-savings.mjs — quantify MEMORY-WIKI-OPTIMIZATION-MS0 wins.
 *
 * MEMORY-WIKI-OPTIMIZATION-MS0 / U-MWO09 (slot:bravo 2026-05-26). Closes the
 * Shift-A validation gate: measure per-chat-per-turn eager-load size BEFORE
 * any optimization (118 KB baseline captured in spec) vs CURRENT state, emit
 * a structured savings report.
 *
 * The 4 eager-load surfaces measured (matching the spec's audit baseline):
 *   1. Project CLAUDE.md          (H:/prism/CLAUDE.md)
 *   2. User CLAUDE.md             (C:/Users/<u>/.claude/CLAUDE.md)
 *   3. RTK.md                     (C:/Users/<u>/.claude/RTK.md)
 *   4. Auto-memory MEMORY.md      (C:/Users/<u>/.claude/projects/H--PRISM/memory/MEMORY.md)
 *
 * Baseline numbers come from the spec table (state/shared/specs/
 * MEMORY-WIKI-OPTIMIZATION-2026-05-26.md). Current numbers are measured live.
 * Savings = baseline - current; pct-saved = savings / baseline.
 *
 * Token estimate: chars/4 — Anthropic's documented approximation for English
 * (https://docs.anthropic.com/claude/docs/glossary). NOT exact tokenization;
 * good enough for fleet-savings sign + order-of-magnitude.
 *
 * Usage:  node scripts/measure-fleet-token-savings.mjs [--json]
 * Exit:   0 ok · 1 any source missing · 2 runtime error
 *
 * @module scripts/measure-fleet-token-savings
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Baseline byte counts captured 2026-05-26 in the spec audit (pre-MWO ship).
export const BASELINE_BYTES = {
  "project-CLAUDE.md": 74500,
  "user-CLAUDE.md":    25800,
  "RTK.md":             4400,
  "auto-memory-MEMORY.md": 24400,
};

export const CHARS_PER_TOKEN = 4;  // Anthropic English approximation.

/** Pure: byte count → token count. */
export function bytesToTokens(bytes) {
  return Math.round(bytes / CHARS_PER_TOKEN);
}

/** Pure: percent saved with safe-divide. */
export function pctSaved(baseline, current) {
  if (baseline <= 0) return 0;
  return Math.max(0, (baseline - current) / baseline);
}

/** Pure: build the report from baseline + measured map. */
export function buildReport(baseline, current) {
  const rows = [];
  let totalBaseline = 0;
  let totalCurrent = 0;
  for (const key of Object.keys(baseline)) {
    const b = baseline[key];
    const c = current[key] ?? 0;
    totalBaseline += b;
    totalCurrent += c;
    rows.push({
      surface: key,
      baselineBytes: b,
      currentBytes: c,
      savedBytes: b - c,
      pctSaved: pctSaved(b, c),
      baselineTokens: bytesToTokens(b),
      currentTokens: bytesToTokens(c),
      savedTokens: bytesToTokens(b - c),
    });
  }
  return {
    schemaVersion: "1.0.0",
    measured_at: new Date().toISOString(),
    surfaces: rows,
    totals: {
      baselineBytes: totalBaseline,
      currentBytes: totalCurrent,
      savedBytes: totalBaseline - totalCurrent,
      pctSaved: pctSaved(totalBaseline, totalCurrent),
      baselineTokens: bytesToTokens(totalBaseline),
      currentTokens: bytesToTokens(totalCurrent),
      savedTokens: bytesToTokens(totalBaseline - totalCurrent),
    },
    targetPctSaved: 0.8,   // spec target ≥80% reduction
    goalMet: pctSaved(totalBaseline, totalCurrent) >= 0.8,
  };
}

/** I/O wrapper — measures live sizes. */
export function measureCurrent({ fsImpl = fs, root = ROOT, home = os.homedir() } = {}) {
  const paths = {
    "project-CLAUDE.md":         path.join(root, "CLAUDE.md"),
    "user-CLAUDE.md":            path.join(home, ".claude", "CLAUDE.md"),
    "RTK.md":                    path.join(home, ".claude", "RTK.md"),
    "auto-memory-MEMORY.md":     path.join(home, ".claude", "projects", "H--PRISM", "memory", "MEMORY.md"),
  };
  const current = {};
  const missing = [];
  for (const [key, file] of Object.entries(paths)) {
    try {
      const stat = fsImpl.statSync(file);
      current[key] = stat.size;
    } catch {
      current[key] = 0;
      missing.push({ key, file });
    }
  }
  return { current, paths, missing };
}

/** Render compact human-readable table. */
export function renderTable(report) {
  const lines = [
    `# Fleet token-savings report (MEMORY-WIKI-OPTIMIZATION-MS0 / U-MWO09)`,
    ``,
    `Measured: ${report.measured_at}`,
    ``,
    `| Surface | Baseline | Current | Saved | % saved | Tokens saved |`,
    `|---------|---------:|--------:|------:|--------:|-------------:|`,
  ];
  for (const r of report.surfaces) {
    lines.push(`| ${r.surface} | ${r.baselineBytes} | ${r.currentBytes} | ${r.savedBytes} | ${(r.pctSaved * 100).toFixed(1)}% | ${r.savedTokens} |`);
  }
  const t = report.totals;
  lines.push(`| **TOTAL** | **${t.baselineBytes}** | **${t.currentBytes}** | **${t.savedBytes}** | **${(t.pctSaved * 100).toFixed(1)}%** | **${t.savedTokens}** |`);
  lines.push(``);
  lines.push(`Target: ≥${(report.targetPctSaved * 100).toFixed(0)}% reduction. Goal met: ${report.goalMet ? "✓ YES" : "✗ NO"}`);
  return lines.join("\n");
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith("measure-fleet-token-savings.mjs")) {
  try {
    const { current, missing } = measureCurrent();
    const report = buildReport(BASELINE_BYTES, current);
    if (process.argv.includes("--json")) {
      process.stdout.write(`${JSON.stringify({ ...report, missing }, null, 2)}\n`);
    } else {
      process.stdout.write(`${renderTable(report)}\n`);
      if (missing.length) {
        process.stderr.write(`\n⚠ ${missing.length} source(s) missing:\n${missing.map((m) => `  - ${m.key}: ${m.file}`).join("\n")}\n`);
      }
    }
    process.exit(missing.length ? 1 : 0);
  } catch (e) {
    process.stderr.write(`measure-fleet-token-savings: ${e instanceof Error ? e.message : String(e)}\n`);
    process.exit(2);
  }
}
