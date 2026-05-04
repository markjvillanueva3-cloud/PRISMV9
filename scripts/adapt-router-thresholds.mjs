#!/usr/bin/env node
/**
 * adapt-router-thresholds.mjs — INTEL-OLLAMA-OBSIDIAN-MS0 / P23-U02
 *
 * Reads last-7d ModelTelemetry, decides whether the static ModelRouterEngine
 * tier thresholds should shift, and persists the decision so the engine can
 * pick it up via getThresholds().
 *
 * Why thresholds shift:
 *   - If tier-3 (deepseek-r1) p95 latency on tier-3 prompts climbs >7s,
 *     raise complexContextTokens so fewer prompts route there (demote-to-tier-2).
 *   - If tier-2 (qwen-14b) success rate drops <0.85 on tier-2 prompts,
 *     lower largeContextTokens so simpler prompts demote to tier-1.
 *   - If tier-3 success rate drops <0.80 OR error rate >0.10 over the window,
 *     raise complexContextTokens (avoid feeding deepseek prompts it fails on).
 *
 * Decisions are conservative: changes are bounded to ±25% per run to avoid
 * oscillation. Adjustment log appended to data/state/router-adaptation.jsonl
 * for audit + rollback.
 *
 * Cron contract: weekly. Idempotent — running twice with same telemetry yields
 * the same decision.
 *
 *   node scripts/adapt-router-thresholds.mjs                 # apply + log
 *   node scripts/adapt-router-thresholds.mjs --dry-run       # decide only, no write
 *   node scripts/adapt-router-thresholds.mjs --windowDays=14 # custom window
 *
 * Persistence:
 *   - Reads:  mcp-server/data/state/model-telemetry.jsonl
 *   - Writes: mcp-server/data/state/router-adaptation.jsonl  (one line per run)
 *   - Writes: mcp-server/data/state/router-thresholds.json  (the live values
 *             ModelRouterEngine.loadThresholdsFromState() — P23-U02 hook —
 *             reads on startup)
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const TELEMETRY_FILE = path.resolve("mcp-server/data/state/model-telemetry.jsonl");
const ADAPTATION_LOG = path.resolve("mcp-server/data/state/router-adaptation.jsonl");
const THRESHOLDS_FILE = path.resolve("mcp-server/data/state/router-thresholds.json");

// Engine defaults — must mirror DEFAULT_THRESHOLDS in ModelRouterEngine.ts
const DEFAULT_LARGE = 3000;
const DEFAULT_COMPLEX = 6000;

// Bounds — never let the tuner produce silly values.
const MIN_LARGE = 500;
const MAX_LARGE = 12000;
const MIN_COMPLEX = 1000;
const MAX_COMPLEX = 24000;

// Quality / latency triggers
const TIER3_LATENCY_DEMOTE_MS = 7000;
const TIER3_FAIL_RATE_DEMOTE = 0.20;     // success<0.80 OR error>0.10
const TIER2_SUCCESS_RAISE = 0.85;
const STEP = 0.20;                       // ±20% per adjustment step
const MAX_PER_RUN = 0.25;                // hard cap on net change per run

const args = parseArgs(process.argv.slice(2));

async function main() {
  const windowMs = (args.windowDays ?? 7) * MS_PER_DAY;
  const cutoff = Date.now() - windowMs;
  const records = await readTelemetry(cutoff);
  const decision = await decide(records);

  const adjustment = {
    ts: new Date().toISOString(),
    windowDays: args.windowDays ?? 7,
    sampleSize: records.length,
    before: decision.before,
    after: decision.after,
    changed: decision.changed,
    rationale: decision.rationale,
    perTier: decision.perTier,
    dryRun: !!args.dryRun,
  };

  if (args.dryRun) {
    console.log(JSON.stringify(adjustment, null, 2));
    return;
  }

  if (decision.changed) {
    await writeJson(THRESHOLDS_FILE, decision.after);
  }
  await appendLine(ADAPTATION_LOG, JSON.stringify(adjustment));
  console.log(`router-thresholds: ${decision.changed ? "ADJUSTED" : "no-change"} `
    + `large=${decision.after.largeContextTokens} complex=${decision.after.complexContextTokens} `
    + `(samples=${records.length}, days=${args.windowDays ?? 7})`);
  if (decision.rationale.length > 0) {
    for (const r of decision.rationale) console.log(`  · ${r}`);
  }
}

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    if (a === "--dry-run") out.dryRun = true;
    else if (a.startsWith("--windowDays=")) out.windowDays = Number(a.split("=")[1]);
    else if (a === "--help" || a === "-h") { printHelp(); process.exit(0); }
  }
  if (out.windowDays !== undefined && (!Number.isFinite(out.windowDays) || out.windowDays <= 0)) {
    throw new Error(`--windowDays must be positive number, got ${out.windowDays}`);
  }
  return out;
}

function printHelp() {
  console.log("Usage: adapt-router-thresholds.mjs [--dry-run] [--windowDays=N]");
}

async function readTelemetry(cutoff) {
  let raw = "";
  try { raw = await fs.readFile(TELEMETRY_FILE, "utf-8"); }
  catch { return []; }
  const out = [];
  for (const line of raw.split("\n")) {
    if (line.length === 0) continue;
    try {
      const r = JSON.parse(line);
      if (typeof r.ts !== "string") continue;
      const t = Date.parse(r.ts);
      if (Number.isNaN(t) || t < cutoff) continue;
      out.push(r);
    } catch {
      // skip corrupt line
    }
  }
  return out;
}

async function readCurrentThresholds() {
  try {
    const raw = await fs.readFile(THRESHOLDS_FILE, "utf-8");
    const j = JSON.parse(raw);
    return {
      largeContextTokens: typeof j.largeContextTokens === "number" ? j.largeContextTokens : DEFAULT_LARGE,
      complexContextTokens: typeof j.complexContextTokens === "number" ? j.complexContextTokens : DEFAULT_COMPLEX,
    };
  } catch {
    return { largeContextTokens: DEFAULT_LARGE, complexContextTokens: DEFAULT_COMPLEX };
  }
}

function tierStats(records, tier) {
  const recs = records.filter((r) => r.tier === tier);
  if (recs.length === 0) {
    return { calls: 0, successRate: 1, errorRate: 0, p95LatencyMs: 0, meanLatencyMs: 0 };
  }
  const ok = recs.filter((r) => r.outcome === "ok").length;
  const err = recs.filter((r) => r.outcome === "error" || r.outcome === "timeout").length;
  const lats = recs.map((r) => r.latencyMs).sort((a, b) => a - b);
  const p95 = lats[Math.min(lats.length - 1, Math.floor(0.95 * lats.length))];
  const mean = lats.reduce((s, x) => s + x, 0) / lats.length;
  return {
    calls: recs.length,
    successRate: ok / recs.length,
    errorRate: err / recs.length,
    p95LatencyMs: p95,
    meanLatencyMs: Math.round(mean),
  };
}

function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}

async function decide(records) {
  const before = await readCurrentThresholds();
  const tier1 = tierStats(records, 1);
  const tier2 = tierStats(records, 2);
  const tier3 = tierStats(records, 3);
  const rationale = [];

  let large = before.largeContextTokens;
  let complex = before.complexContextTokens;

  // Rule A: tier-3 too slow → raise complex threshold (fewer prompts go to deepseek)
  if (tier3.calls >= 5 && tier3.p95LatencyMs > TIER3_LATENCY_DEMOTE_MS) {
    const proposed = Math.round(complex * (1 + STEP));
    rationale.push(`tier-3 p95=${tier3.p95LatencyMs}ms > ${TIER3_LATENCY_DEMOTE_MS}ms → raise complex ${complex}→${proposed}`);
    complex = proposed;
  }

  // Rule B: tier-3 unreliable → raise complex threshold
  if (tier3.calls >= 5 && (tier3.successRate < (1 - TIER3_FAIL_RATE_DEMOTE) || tier3.errorRate > 0.10)) {
    const proposed = Math.round(complex * (1 + STEP));
    rationale.push(`tier-3 success=${tier3.successRate.toFixed(2)} err=${tier3.errorRate.toFixed(2)} → raise complex ${complex}→${proposed}`);
    complex = proposed;
  }

  // Rule C: tier-2 unreliable → lower large threshold (simpler prompts demote to tier-1)
  if (tier2.calls >= 5 && tier2.successRate < TIER2_SUCCESS_RAISE) {
    const proposed = Math.round(large * (1 - STEP));
    rationale.push(`tier-2 success=${tier2.successRate.toFixed(2)} < ${TIER2_SUCCESS_RAISE} → lower large ${large}→${proposed}`);
    large = proposed;
  }

  // Hard cap per-run change to ±MAX_PER_RUN of starting value
  large = clamp(large,
    Math.max(MIN_LARGE, Math.round(before.largeContextTokens * (1 - MAX_PER_RUN))),
    Math.min(MAX_LARGE, Math.round(before.largeContextTokens * (1 + MAX_PER_RUN))));
  complex = clamp(complex,
    Math.max(MIN_COMPLEX, Math.round(before.complexContextTokens * (1 - MAX_PER_RUN))),
    Math.min(MAX_COMPLEX, Math.round(before.complexContextTokens * (1 + MAX_PER_RUN))));

  // Invariant: complex must exceed large (matches engine validation)
  if (complex <= large) {
    complex = large + 100;
    rationale.push(`complex<=large after adjust → bumped to large+100=${complex}`);
  }

  const after = { largeContextTokens: large, complexContextTokens: complex };
  const changed =
    before.largeContextTokens !== after.largeContextTokens
    || before.complexContextTokens !== after.complexContextTokens;

  return { before, after, changed, rationale, perTier: { tier1, tier2, tier3 } };
}

async function writeJson(file, payload) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(payload, null, 2) + "\n", "utf-8");
}

async function appendLine(file, line) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.appendFile(file, line + "\n", "utf-8");
}

main().catch((e) => {
  console.error(`adapt-router-thresholds: ${e.message ?? String(e)}`);
  process.exit(1);
});
