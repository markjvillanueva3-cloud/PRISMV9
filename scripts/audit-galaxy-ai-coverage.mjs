#!/usr/bin/env node
/**
 * audit-galaxy-ai-coverage.mjs -- the VALIDATE surface for "no dormant AI nodes
 * across all galaxies" (U-LORA-COVERAGE-AUDIT, slot:india 2026-06-10).
 *
 * Every galaxy has a compounded synthesis brain (knowledge/memories/patterns/
 * <galaxy>_synthesis.md). The vault->LoRA pipeline turns those brains into
 * per-galaxy training pairs. THIS auditor closes the verification loop: it
 * cross-checks the set of galaxy BRAINS against the set of galaxies that actually
 * produced LoRA pairs, and FLAGS any galaxy that has a brain but ZERO training
 * signal -- a dormant AI node (e.g. a brain whose every bullet was too thin to
 * survive the SYNTH_MIN_BULLET_CHARS gate). Read-only; reuses the reviewed
 * collectGalaxySynthesisExamples (no re-implementation of the parse).
 *
 * Usage:
 *   node scripts/audit-galaxy-ai-coverage.mjs          # human report
 *   node scripts/audit-galaxy-ai-coverage.mjs --json   # machine-readable
 * Exit code 1 if any dormant galaxy is found (so a cron/CI can gate on it).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { collectGalaxySynthesisExamples, galaxyFromSynthesisFile } from "./vault-to-lora-dataset.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PATTERNS_DIR = path.join(ROOT, "knowledge", "memories", "patterns");

/** List the galaxy slugs that have a synthesis brain (excludes _meta). */
export function listBrainGalaxies(dir = PATTERNS_DIR, readdirImpl = fs.readdirSync) {
  let files = [];
  try { files = readdirImpl(dir).filter((f) => f.endsWith("_synthesis.md")); }
  catch { return []; }
  const galaxies = [];
  for (const f of files) {
    const g = galaxyFromSynthesisFile(f);
    if (g) galaxies.push(g);
  }
  return galaxies.sort();
}

/**
 * Tally per-galaxy pair counts from a flat examples list (each carries _galaxy).
 * Returns { <galaxy>: count }.
 */
export function tallyPairsByGalaxy(examples) {
  const byGalaxy = {};
  for (const e of examples || []) {
    if (e && e._galaxy) byGalaxy[e._galaxy] = (byGalaxy[e._galaxy] || 0) + 1;
  }
  return byGalaxy;
}

/**
 * Cross-check brains vs pair coverage. A galaxy with a brain but 0 pairs is a
 * DORMANT AI node. A galaxy with pairs but no brain (should not happen) is an
 * ORPHAN. Returns a structured report.
 */
export function auditGalaxyCoverage(brainGalaxies, byGalaxy) {
  const brains = new Set(brainGalaxies || []);
  const withPairs = new Set(Object.keys(byGalaxy || {}));
  const dormant = [...brains].filter((g) => (byGalaxy[g] || 0) === 0).sort();
  const orphanPairs = [...withPairs].filter((g) => !brains.has(g)).sort();
  return {
    totalBrains: brains.size,
    galaxiesWithPairs: withPairs.size,
    totalPairs: Object.values(byGalaxy || {}).reduce((n, c) => n + c, 0),
    dormant,
    dormantCount: dormant.length,
    orphanPairs,
    fullyCovered: dormant.length === 0 && orphanPairs.length === 0,
  };
}

export function runAudit({ dir = PATTERNS_DIR } = {}) {
  const brains = listBrainGalaxies(dir);
  const { examples } = collectGalaxySynthesisExamples(dir);
  const byGalaxy = tallyPairsByGalaxy(examples);
  return { ...auditGalaxyCoverage(brains, byGalaxy), byGalaxy };
}

function argValue(argv, flag) {
  const i = argv.indexOf(flag);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
}

function main() {
  const argv = process.argv.slice(2);
  const json = argv.includes("--json");
  // --dir <path> overrides the patterns dir (lets a cron/CI/test target a fixture).
  const dir = argValue(argv, "--dir");
  const report = dir ? runAudit({ dir }) : runAudit();
  if (json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`Galaxy AI-training coverage: ${report.galaxiesWithPairs}/${report.totalBrains} brains have LoRA pairs (${report.totalPairs} pairs total)`);
    console.log(`fully covered (no dormant AI nodes): ${report.fullyCovered}`);
    if (report.dormantCount) console.log(`DORMANT (brain present, 0 pairs): ${report.dormant.join(", ")}`);
    if (report.orphanPairs.length) console.log(`ORPHAN (pairs but no brain): ${report.orphanPairs.join(", ")}`);
  }
  // Non-zero exit if any galaxy is dormant -- lets a cron/CI gate on coverage.
  if (report.dormantCount > 0 || report.orphanPairs.length > 0) process.exitCode = 1;
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) main();
