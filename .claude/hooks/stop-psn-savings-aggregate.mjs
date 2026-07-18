#!/usr/bin/env node
// tier: T3
/**
 * stop-psn-savings-aggregate.mjs — Stop hook
 *
 * PSN-SAVINGS-AGGREGATE/U-PSA01 (2026-05-24, slot:alpha)
 *
 * Reads the 6 token-savings telemetry sidecars and writes a unified daily
 * summary to state/shared/dashboards/psn-savings-aggregate.json. Master-index
 * nightly regen picks it up so future prompts see the cumulative figure.
 *
 * Throttled 1/hour global to avoid 16-chat fleet Stop bursts re-aggregating.
 *
 * Knobs:
 *   PRISM_PSN_AGGREGATE_DISABLE=1
 *   PRISM_PSN_AGGREGATE_THROTTLE_MS (default 3600000 = 1h)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, openSync, readSync, closeSync, fstatSync } from "node:fs";
import path from "node:path";
import { incrementalAggregate } from "../../scripts/lib/psn-savings-aggregate.mjs";

const SOURCES = {
  "rtk-savings-ledger": "H:/prism/state/shared/dashboards/rtk-savings-ledger.jsonl",
  "prompt-rewrites": "H:/prism/.claude/cache/prompt-rewrites.jsonl",
  "pre-tool-savings-multi": "H:/prism/state/shared/dashboards/pre-tool-savings-multi.jsonl",
  "read-auto-limit": "H:/prism/state/shared/dashboards/read-auto-limit-ledger.jsonl",
  "rtk-adoption-measure": "H:/prism/state/shared/dashboards/rtk-adoption-measure.jsonl",
  // U-SV-NODE-PATH-TEMPLATE (sierra): node→path nav resolutions that turned a
  // graph hint into a direct `Read: <path>` (saved Grep/Glob searches). Producer:
  // master-index-precheck-inject + pre-bash-graph-inject via nav-savings-ledger.mjs.
  "nav": "H:/prism/state/shared/dashboards/nav-savings-ledger.jsonl",
};
const DEDUP_CACHE = "H:/prism/state/shared/dashboards/injection-dedup-cache.json";
const OUTPUT = "H:/prism/state/shared/dashboards/psn-savings-aggregate.json";
// U-PSN-INCREMENTAL-AGGREGATE (2026-06-22, slot:alpha): the deferred follow-up to
// U-PSN-AGGREGATE-TAILREAD-FIX is now SHIPPED. main() no longer re-parses every ledger
// in full on each run -- it carries a per-ledger byte offset (_checkpoint) and parses
// ONLY the bytes appended since the last run (incrementalAggregate). Per-run read cost is
// bounded by the delta, not the file size, so the unbounded ledgers (pre-tool-savings-
// multi / rtk-adoption / read-auto / nav) no longer drive an ever-growing per-run parse.
//
// MAX_READ_BYTES is now the RE-BASELINE crash-guard only: full re-reads happen rarely
// (cold start, or a detected shrink/front-rewrite from stop-ledger-prune) and are capped
// to the most-recent 64MB at a CLEAN line boundary (a tail-capped re-baseline undercounts
// the dropped head -- disclosed, never silent; 64MB = ~5x the verified largest live ledger
// pre-tool-savings-multi ~13.2MB). tailRead is retained below as the tested clean-boundary
// slicer + the documented ceiling; the per-run path uses byte-range deltas via readRangeOf.
// See [[reference_psn_aggregate_tailread_fix_2026_06_21]].
export const MAX_READ_BYTES = 64_000_000;
const DEFAULT_THROTTLE_MS = 60 * 60_000;

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

export function tailRead(filePath, maxBytes) {
  try {
    if (!existsSync(filePath)) return "";
    const st = statSync(filePath);
    if (st.size === 0) return "";
    const buf = readFileSync(filePath, "utf8");
    if (buf.length <= maxBytes) return buf;
    // Truncating: byte-slicing can land mid-record. Advance past the first newline
    // so the first parsed line is always a COMPLETE entry (the old code left a partial
    // fragment that JSON.parse silently dropped, losing a real boundary entry). BUT
    // only strip when the slice actually began mid-line: if the byte before the cut is
    // already a newline, the slice starts at a clean line boundary and the first line
    // is whole -- stripping it there would drop a complete entry. No newline in the
    // slice at all -> return as-is (single oversized line).
    const start = buf.length - maxBytes;
    const sliced = buf.slice(start);
    if (start > 0 && buf[start - 1] !== "\n") {
      const nl = sliced.indexOf("\n");
      return nl >= 0 ? sliced.slice(nl + 1) : sliced;
    }
    return sliced;
  } catch { return ""; }
}

function readJsonSafe(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }
function writeJsonSafe(p, obj) {
  try {
    if (!existsSync(path.dirname(p))) mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
  } catch { /* ignore */ }
}

// -- byte-range fs readers for the incremental path (exported for tests). All fail-soft:
//    a missing/unreadable ledger yields null/empty, never a throw (the aggregate must
//    never break a Stop). Offsets are BYTE positions (readSync `position`), so multibyte
//    UTF-8 ledgers stay correct (string-offset slicing would not).
export function statSizeOf(filePath) {
  try { return existsSync(filePath) ? statSync(filePath).size : null; } catch { return null; }
}

export function readHeadOf(filePath, n) {
  let fd;
  try {
    fd = openSync(filePath, "r");
    const sz = fstatSync(fd).size;
    const len = Math.min(n, sz);
    if (len <= 0) return "";
    const b = Buffer.allocUnsafe(len);
    const r = readSync(fd, b, 0, len, 0);
    return b.toString("utf8", 0, r);
  } catch { return ""; }
  finally { if (fd !== undefined) { try { closeSync(fd); } catch { /* ignore */ } } }
}

export function readRangeOf(filePath, start, end) {
  const len = end - start;
  if (len <= 0) return Buffer.alloc(0);
  let fd;
  try {
    fd = openSync(filePath, "r");
    const b = Buffer.allocUnsafe(len);
    const r = readSync(fd, b, 0, len, start);
    return b.subarray(0, r);
  } catch { return Buffer.alloc(0); }
  finally { if (fd !== undefined) { try { closeSync(fd); } catch { /* ignore */ } } }
}

function main() {
  if (process.env.PRISM_PSN_AGGREGATE_DISABLE === "1") return pass();
  const throttleMs = Number.parseInt(process.env.PRISM_PSN_AGGREGATE_THROTTLE_MS ?? String(DEFAULT_THROTTLE_MS), 10);
  const existing = readJsonSafe(OUTPUT) || {};
  const lastRunAt = Number(existing._meta?.lastRunAt ?? 0);
  const now = Date.now();
  if ((now - lastRunAt) < throttleMs) return pass();

  const ids = Object.keys(SOURCES);
  const { byLedger, totals, checkpoint } = incrementalAggregate({
    ids,
    checkpoint: existing._checkpoint || {},
    prevByLedger: existing.byLedger || {},
    statSize: (name) => statSizeOf(SOURCES[name]),
    readHead: (name, n) => readHeadOf(SOURCES[name], n),
    readRange: (name, s, e) => readRangeOf(SOURCES[name], s, e),
    maxReadBytes: MAX_READ_BYTES,
    dedupCacheJson: readJsonSafe(DEDUP_CACHE),
  });

  writeJsonSafe(OUTPUT, {
    schemaVersion: "1.1.0",
    _meta: { lastRunAt: now, generatedBy: "stop-psn-savings-aggregate.mjs", mode: "incremental" },
    totals,
    byLedger,
    _checkpoint: checkpoint,
  });
  pass();
}

if (process.argv[1] && process.argv[1].endsWith("stop-psn-savings-aggregate.mjs")) {
  try { main(); } catch { pass(); }
}
