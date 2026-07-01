#!/usr/bin/env node
// scripts/cag-stats-aggregator.mjs
//
// U-CAG-02-TELEMETRY-CHANNEL — scan state/shared/cag-route/slot-soul-cached-*.json
// sidecars (one per session, written by U-CAG-01-SOUL-TO-SESSIONSTART hook),
// aggregate into per-slot + total counts, emit jsonl line to
// state/shared/dashboards/cag-stats.jsonl.
//
// Closes audit-2026-05-16 finding F6 partial: "no context-utilization
// telemetry (the gap that makes F1's number real)." This unit measures the
// INJECTION side (sidecars written) not the CACHE-HIT side (Anthropic API
// cache_read_input_tokens). Hit-side measurement requires API-response
// capture which is out-of-scope — split into U-CAG-02B.
//
// Pure-function library + CLI. CLI: --json | --dry-run | <no args>=write
// Knobs:
//   PRISM_CAG_STATS_INPUT_DIR=<path>   override input cag-route dir
//   PRISM_CAG_STATS_OUTPUT=<path>      override output jsonl

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DEFAULT_INPUT_DIR = path.join(ROOT, "state/shared/cag-route");
const DEFAULT_OUTPUT = path.join(ROOT, "state/shared/dashboards/cag-stats.jsonl");
const SCHEMA_VERSION = 1;

function getInputDir() {
  return process.env.PRISM_CAG_STATS_INPUT_DIR || DEFAULT_INPUT_DIR;
}
function getOutputPath() {
  return process.env.PRISM_CAG_STATS_OUTPUT || DEFAULT_OUTPUT;
}

/**
 * List slot-soul-cached-*.json sidecars in the cag-route dir. Returns paths
 * sorted ascending by filename (deterministic). Empty array if dir missing.
 */
export function listSidecars(inputDir) {
  if (!fs.existsSync(inputDir)) return [];
  let entries;
  try {
    entries = fs.readdirSync(inputDir);
  } catch {
    return [];
  }
  return entries
    .filter((n) => n.startsWith("slot-soul-cached-") && n.endsWith(".json"))
    .sort()
    .map((n) => path.join(inputDir, n));
}

/**
 * Read + parse a single sidecar. Returns the parsed object or null on any
 * IO/parse failure. Best-effort — sidecars are advisory.
 */
export function readSidecar(p) {
  try {
    const raw = fs.readFileSync(p, "utf8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Aggregate parsed sidecars into per-slot + totals.
 * Returns: {total, by_slot: {slot: {sessions, totalSoulBytes, totalBlockBytes, expansionRatio, lastTs}}, ts, schemaVersion}
 */
export function aggregateSidecars(sidecars, now = new Date().toISOString()) {
  const bySlot = {};
  let total = 0;
  let totalSoulBytes = 0;
  let totalBlockBytes = 0;
  for (const s of sidecars) {
    if (!s || typeof s !== "object") continue;
    total++;
    const slot = typeof s.slot === "string" && s.slot.length > 0 ? s.slot : "_unknown";
    const sb = Number.isFinite(s.soulBytes) ? s.soulBytes : 0;
    const bb = Number.isFinite(s.blockBytes) ? s.blockBytes : 0;
    totalSoulBytes += sb;
    totalBlockBytes += bb;
    let cell = bySlot[slot];
    if (!cell) {
      cell = {
        sessions: 0,
        totalSoulBytes: 0,
        totalBlockBytes: 0,
        firstTs: s.ts || null,
        lastTs: s.ts || null,
      };
      bySlot[slot] = cell;
    }
    cell.sessions++;
    cell.totalSoulBytes += sb;
    cell.totalBlockBytes += bb;
    if (s.ts) {
      if (!cell.firstTs || s.ts < cell.firstTs) cell.firstTs = s.ts;
      if (!cell.lastTs || s.ts > cell.lastTs) cell.lastTs = s.ts;
    }
  }
  // Compute expansion ratio per slot (block/soul — overhead from header + footer markdown).
  for (const cell of Object.values(bySlot)) {
    cell.expansionRatio = cell.totalSoulBytes > 0 ? cell.totalBlockBytes / cell.totalSoulBytes : 0;
  }
  return {
    schemaVersion: SCHEMA_VERSION,
    ts: now,
    kind: "cag-stats-aggregator",
    total,
    totalSoulBytes,
    totalBlockBytes,
    overallExpansionRatio: totalSoulBytes > 0 ? totalBlockBytes / totalSoulBytes : 0,
    by_slot: bySlot,
    note: "Injection-side telemetry only. Each sidecar = one SessionStart that emitted a slot-soul cached block. Cache-hit-side (Anthropic API cache_read_input_tokens) needs separate capture — see U-CAG-02B.",
  };
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

export function appendStats(entry, outputPath) {
  ensureDir(path.dirname(outputPath));
  fs.appendFileSync(outputPath, JSON.stringify(entry) + "\n");
  return outputPath;
}

/** Top-level: scan + aggregate. Returns the entry, does NOT write. */
export function aggregate(inputDir) {
  const paths = listSidecars(inputDir);
  const parsed = paths.map(readSidecar).filter((p) => p !== null);
  return aggregateSidecars(parsed);
}

function main() {
  const args = process.argv.slice(2);
  const entry = aggregate(getInputDir());
  if (args.includes("--json")) {
    console.log(JSON.stringify(entry, null, 2));
    return;
  }
  if (args.includes("--dry-run")) {
    console.log(
      `# DRY RUN — would append to ${getOutputPath()} (total=${entry.total} sessions, ${Object.keys(entry.by_slot).length} distinct slot(s))`,
    );
    return;
  }
  const out = appendStats(entry, getOutputPath());
  console.log(
    `# Appended cag-stats entry to ${out} — total=${entry.total} sessions across ${Object.keys(entry.by_slot).length} slot(s); expansion ${entry.overallExpansionRatio.toFixed(2)}x`,
  );
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}`) {
  main();
}
