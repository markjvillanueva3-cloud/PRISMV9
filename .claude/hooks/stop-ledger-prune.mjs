#!/usr/bin/env node
// tier: T3
/**
 * stop-ledger-prune.mjs — Stop hook
 *
 * PSN-LEDGER-HYGIENE/U-LEDGER-PRUNE (2026-05-24, slot:alpha)
 *
 * Bounded growth for PRISM's JSONL ledgers. When any tracked ledger crosses
 * the size cap, drop the head and retain the tail. Runs on Stop; throttled
 * 1/30min global so fleet Stop bursts don't thrash the files.
 *
 * Pure-function logic lives in scripts/lib/jsonl-tail-prune.mjs. This hook
 * owns the FS I/O + throttle marker.
 *
 * Tracked ledgers:
 *   - rtk-savings-ledger.jsonl
 *   - prompt-rewrites.jsonl
 *   - mcp-route-suggest-stats sidecar (recent[] grows unbounded otherwise)
 *
 * Knobs:
 *   PRISM_LEDGER_PRUNE_DISABLE=1
 *   PRISM_LEDGER_PRUNE_THROTTLE_MS (default 1800000 = 30min)
 *   PRISM_LEDGER_PRUNE_CAP_BYTES   (default 5MB)
 *   PRISM_LEDGER_PRUNE_RETAIN_BYTES (default 1MB)
 */

import { readFileSync, writeFileSync, statSync, existsSync, mkdirSync } from "node:fs";
import path from "node:path";
import { pruneTail, DEFAULT_SIZE_CAP_BYTES, DEFAULT_RETAIN_BYTES } from "../../scripts/lib/jsonl-tail-prune.mjs";

const LEDGERS = [
  "H:/prism/state/shared/dashboards/rtk-savings-ledger.jsonl",
  "H:/prism/.claude/cache/prompt-rewrites.jsonl",
];

const THROTTLE_FILE = "H:/prism/state/shared/dashboards/.ledger-prune-last.json";
const DEFAULT_THROTTLE_MS = 30 * 60_000;

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }
function readJsonSafe(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return {}; } }
function writeJsonSafe(p, obj) {
  try {
    if (!existsSync(path.dirname(p))) mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(obj), "utf8");
  } catch { /* ignore */ }
}

function pruneOne(filePath, capBytes, retainBytes) {
  try {
    if (!existsSync(filePath)) return null;
    const st = statSync(filePath);
    if (st.size <= capBytes) return null;
    const txt = readFileSync(filePath, "utf8");
    const result = pruneTail(txt, capBytes, retainBytes);
    if (!result.pruned) return null;
    writeFileSync(filePath, result.newText, "utf8");
    return { filePath, ...result };
  } catch { return null; }
}

function main() {
  if (process.env.PRISM_LEDGER_PRUNE_DISABLE === "1") return pass();

  const throttleMs = Number.parseInt(process.env.PRISM_LEDGER_PRUNE_THROTTLE_MS ?? String(DEFAULT_THROTTLE_MS), 10);
  const cap = Number.parseInt(process.env.PRISM_LEDGER_PRUNE_CAP_BYTES ?? String(DEFAULT_SIZE_CAP_BYTES), 10);
  const retain = Number.parseInt(process.env.PRISM_LEDGER_PRUNE_RETAIN_BYTES ?? String(DEFAULT_RETAIN_BYTES), 10);

  const state = readJsonSafe(THROTTLE_FILE);
  const now = Date.now();
  if (state.lastRunAt && (now - state.lastRunAt) < throttleMs) return pass();

  let anyPruned = false;
  for (const p of LEDGERS) {
    const r = pruneOne(p, cap, retain);
    if (r) anyPruned = true;
  }
  if (anyPruned) writeJsonSafe(THROTTLE_FILE, { lastRunAt: now });

  pass();
}

if (process.argv[1] && process.argv[1].endsWith("stop-ledger-prune.mjs")) {
  try { main(); } catch { pass(); }
}
