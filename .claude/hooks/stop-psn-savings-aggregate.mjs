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

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";
import { aggregateSavings } from "../../scripts/lib/psn-savings-aggregate.mjs";

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
const MAX_READ_BYTES = 500_000;
const DEFAULT_THROTTLE_MS = 60 * 60_000;

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

function tailRead(filePath, maxBytes) {
  try {
    if (!existsSync(filePath)) return "";
    const st = statSync(filePath);
    if (st.size === 0) return "";
    const buf = readFileSync(filePath, "utf8");
    return buf.length > maxBytes ? buf.slice(buf.length - maxBytes) : buf;
  } catch { return ""; }
}

function readJsonSafe(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }
function writeJsonSafe(p, obj) {
  try {
    if (!existsSync(path.dirname(p))) mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
  } catch { /* ignore */ }
}

function main() {
  if (process.env.PRISM_PSN_AGGREGATE_DISABLE === "1") return pass();
  const throttleMs = Number.parseInt(process.env.PRISM_PSN_AGGREGATE_THROTTLE_MS ?? String(DEFAULT_THROTTLE_MS), 10);
  const existing = readJsonSafe(OUTPUT) || {};
  const lastRunAt = Number(existing._meta?.lastRunAt ?? 0);
  const now = Date.now();
  if ((now - lastRunAt) < throttleMs) return pass();

  const ledgerInputs = {};
  for (const [name, p] of Object.entries(SOURCES)) ledgerInputs[name] = tailRead(p, MAX_READ_BYTES);
  const dedupCache = readJsonSafe(DEDUP_CACHE);

  const { byLedger, totals } = aggregateSavings(ledgerInputs, dedupCache);

  writeJsonSafe(OUTPUT, {
    schemaVersion: "1.0.0",
    _meta: { lastRunAt: now, generatedBy: "stop-psn-savings-aggregate.mjs" },
    totals,
    byLedger,
  });
  pass();
}

if (process.argv[1] && process.argv[1].endsWith("stop-psn-savings-aggregate.mjs")) {
  try { main(); } catch { pass(); }
}
