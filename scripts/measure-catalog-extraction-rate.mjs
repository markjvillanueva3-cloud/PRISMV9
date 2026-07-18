#!/usr/bin/env node
// scripts/measure-catalog-extraction-rate.mjs
//
// BLACKWELL-DB-GEN-MS0 / U-CGP-MEASURE (slot:romeo, 2026-06-04).
//
// Closes the "estimate vs MEASURED" loop for the catalog/DB-gen efficiency milestone WITHOUT
// evicting peer models. estimateExtractionPlan() (catalog-gpu-profile) deliberately REFUSES to
// fabricate `pagesPerMinPerWorker` — it must be measured on the target GPU. This script derives
// that real rate from the EXISTING serial-era extraction CHECKPOINT history (the 280+ blueprint
// OCR prints already completed under the pre-U-CGP-CONCURRENCY serial loop), then projects the
// Blackwell concurrent plan. Real-data E2E (reads what actually happened) — no live GPU run, so
// it never has to claim the VL model away from the live fleet (R7: don't harm peers).
//
// WHY checkpoint deltas = real timing: each record is appended at print COMPLETION with `ts`.
// Under the serial loop, the gap from the previous completion to this one ≈ the wall time THIS
// print's extraction consumed; that print produced `pages_ok` pages. Aggregate over contiguous
// intervals (excluding between-run idle gaps) → real serial pages/min/worker. Because the
// historical runs were SERIAL (1 worker), the measured rate IS pagesPerMinPerWorker.
//
// USAGE:
//   node scripts/measure-catalog-extraction-rate.mjs [--checkpoint <f>] [--gap-min 30]
//     [--total-pages N] [--out <plan.json>] [--json]
// EXIT: 0 = measured + projected; 2 = insufficient checkpoint data (refuses to fabricate).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { argv, env, exit } from "node:process";
import { detectGpuTier, describeProfile, estimateExtractionPlan, recommendOllamaNumParallel } from "./lib/catalog-gpu-profile.mjs";
import { resolveOllamaParallel } from "./batch-ollama-vision-extract.mjs";

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const DEFAULT_CHECKPOINT = join(REPO_ROOT, "state", "shared", "blueprint-ocr-checkpoint.jsonl");
const GAP_MINUTES_DEFAULT = 30; // a completion-to-completion gap > this = between-run idle (overnight), excluded

// ── pure helpers (exported for tests) ──────────────────────────────

/**
 * Parse a checkpoint JSONL into time-ordered records {ts(ms), pages_ok, ok}. Tolerant of blank/
 * malformed lines and records with an unparseable `ts` (skipped). Sorted ascending by ts. Pure.
 * @param {string} text
 */
export function parseCheckpointRecords(text) {
  const out = [];
  if (typeof text !== "string") return out;
  for (const line of text.split("\n")) {
    const s = line.trim();
    if (!s) continue;
    try {
      const o = JSON.parse(s);
      const t = Date.parse(o && o.ts);
      if (!Number.isFinite(t)) continue;
      out.push({ ts: t, pages_ok: Number.isFinite(o.pages_ok) ? o.pages_ok : 0, ok: !!o.ok });
    } catch {
      /* skip malformed line */
    }
  }
  out.sort((a, b) => a.ts - b.ts);
  return out;
}

/**
 * Measure the REAL serial per-worker page rate (pages_ok per active minute) from completion
 * timestamps. The delta to the previous record ≈ this print's extraction wall time; deltas
 * larger than gapMinutes are between-run idle (overnight windows) and excluded from active time.
 * Failed prints (pages_ok 0) still consumed time, so they correctly drag the realized rate down.
 * Pure; returns {ok:false, reason} on insufficient data — refuses to fabricate (R12), mirroring
 * estimateExtractionPlan's own refusal.
 * @param {Array<{ts:number, pages_ok:number}>} records  time-ordered (parseCheckpointRecords output)
 * @param {number} [gapMinutes]
 */
export function measureSerialRate(records, gapMinutes = GAP_MINUTES_DEFAULT) {
  if (!Array.isArray(records) || records.length < 2)
    return { ok: false, reason: "need ≥2 timestamped checkpoint records to measure a rate" };
  const gapMs = Math.max(0, Number.isFinite(gapMinutes) ? gapMinutes : GAP_MINUTES_DEFAULT) * 60000;
  let activeMin = 0;
  let pages = 0;
  let intervals = 0;
  let idleSkipped = 0;
  for (let i = 1; i < records.length; i++) {
    const dt = records[i].ts - records[i - 1].ts;
    if (!Number.isFinite(dt) || dt <= 0) continue; // duplicate/out-of-order ts — can't time it
    if (dt > gapMs) { idleSkipped++; continue; } // between-run idle, not extraction time
    activeMin += dt / 60000;
    pages += Math.max(0, records[i].pages_ok);
    intervals++;
  }
  if (activeMin <= 0 || pages <= 0 || intervals < 1)
    return { ok: false, reason: "no contiguous extraction intervals (all gaps > threshold or 0 pages produced)" };
  return {
    ok: true,
    pagesPerMinPerWorker: Math.round((pages / activeMin) * 1000) / 1000,
    pagesMeasured: pages,
    intervals,
    idleSkipped,
    activeMin: Math.round(activeMin * 10) / 10,
    gapMinutes: gapMs / 60000,
  };
}

/**
 * Full real-data projection: measure the serial rate from checkpoint records, then project the
 * host's concurrent plan via estimateExtractionPlan (bounded by the live OLLAMA_NUM_PARALLEL).
 * Pure over its inputs (profile + ollamaParallel + totalPages injected). Returns {ok:false} when
 * the measurement is insufficient — never invents a rate.
 * @param {{records:Array, profile:object, ollamaParallel:(number|null), totalPages:number, gapMinutes?:number}} a
 */
export function projectFromCheckpoint(a = {}) {
  const measured = measureSerialRate(a.records, a.gapMinutes);
  if (!measured.ok) return { ok: false, reason: measured.reason };
  const totalPages = Number.isFinite(a.totalPages) && a.totalPages > 0 ? a.totalPages : measured.pagesMeasured;
  const plan = estimateExtractionPlan({
    totalPages,
    pagesPerMinPerWorker: measured.pagesPerMinPerWorker,
    profile: a.profile,
    // estimateExtractionPlan defaults ollamaParallel→workers when omitted; pass null→omit (optimistic),
    // pass a number→bound. null means "unverified", so we let the plan be optimistic but flag it.
    ...(Number.isFinite(a.ollamaParallel) ? { ollamaParallel: a.ollamaParallel } : {}),
  });
  if (!plan || !plan.ok) return { ok: false, reason: (plan && plan.reason) || "estimateExtractionPlan failed" };
  // Surface whether the live OLLAMA_NUM_PARALLEL is below the host's recommended slots — the
  // single config lever between the measured speedup and the host ceiling. underProvisioned only
  // when the live value is KNOWN (finite) and short; unset/null is "unverified", not "under".
  const recommendedParallel = recommendOllamaNumParallel(a.profile);
  const underProvisioned = Number.isFinite(a.ollamaParallel) && a.ollamaParallel < recommendedParallel;
  return {
    ok: true,
    measured,
    plan,
    totalPages,
    ollamaParallelVerified: Number.isFinite(a.ollamaParallel),
    recommendedParallel,
    underProvisioned,
  };
}

// ── CLI ─────────────────────────────────────────────────────────────

function parseArgs(args) {
  const out = { checkpoint: DEFAULT_CHECKPOINT, gapMin: GAP_MINUTES_DEFAULT, totalPages: 0, out: null, json: false };
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--checkpoint") out.checkpoint = args[++i];
    else if (a === "--gap-min") out.gapMin = parseInt(args[++i], 10);
    else if (a === "--total-pages") out.totalPages = parseInt(args[++i], 10);
    else if (a === "--out") out.out = args[++i];
    else if (a === "--json") out.json = true;
  }
  return out;
}

function main() {
  const args = parseArgs(argv.slice(2));
  if (!existsSync(args.checkpoint)) { console.error("ERR: checkpoint not found: " + args.checkpoint); exit(2); }
  const records = parseCheckpointRecords(readFileSync(args.checkpoint, "utf8"));
  const profile = detectGpuTier();
  const ollamaParallel = resolveOllamaParallel(env);
  const res = projectFromCheckpoint({ records, profile, ollamaParallel, totalPages: args.totalPages, gapMinutes: args.gapMin });

  if (!res.ok) {
    console.error(`[measure] insufficient data: ${res.reason} (records=${records.length}, checkpoint=${args.checkpoint})`);
    exit(2);
  }

  const m = res.measured;
  const p = res.plan;
  const artifact = {
    tool: "measure-catalog-extraction-rate",
    measuredFrom: { checkpoint: args.checkpoint, records: records.length, intervals: m.intervals, idleGapsSkipped: m.idleSkipped, activeMin: m.activeMin, gapMinutes: m.gapMinutes },
    measuredSerialRate_pagesPerMinPerWorker: m.pagesPerMinPerWorker,
    gpuProfile: { ...profile, summary: describeProfile(profile) },
    ollamaNumParallel: ollamaParallel, // null = unverified (server-side env)
    recommendedOllamaNumParallel: res.recommendedParallel, // host-aware SSOT (matches 05-soft-config-tweaks.ps1)
    caveat: "measuredSerialRate is a THROUGHPUT FLOOR derived from completion-timestamp deltas — it includes per-print IO/model-load/render, not pure GPU inference. The real concurrent speedup is therefore conservative (biased low), never inflated.",
    projection: p,
    note: res.ollamaParallelVerified
      ? `realized concurrency bounded by OLLAMA_NUM_PARALLEL=${ollamaParallel} → ${p.effectiveWorkers}× effective (${p.concurrencySpeedup}× faster than serial on the same workload)`
      : `OLLAMA_NUM_PARALLEL unset → projection optimistic (×${p.workers}); set it on the server to confirm. CPU render/IO overlaps regardless.`,
    action: res.underProvisioned
      ? `LEVER: OLLAMA_NUM_PARALLEL=${ollamaParallel} is below this host's recommended ${res.recommendedParallel} → run \`scripts/system-health/05-soft-config-tweaks.ps1\` (host-aware, sets ${res.recommendedParallel}) and let Ollama restart on the next idle window to unlock up to ×${Math.min(p.workers, res.recommendedParallel)} inference (currently ×${p.effectiveWorkers}).`
      : `OLLAMA_NUM_PARALLEL adequate (live ${ollamaParallel ?? "unset"} vs recommended ${res.recommendedParallel}) — no config lever pending.`,
  };

  if (args.out) {
    try { mkdirSync(dirname(args.out), { recursive: true }); writeFileSync(args.out, JSON.stringify(artifact, null, 2) + "\n"); }
    catch (e) { console.error(`[measure] artifact write failed: ${e.message}`); }
  }
  if (args.json) { console.log(JSON.stringify(artifact, null, 2)); }
  else {
    console.log(`[measure] ${m.intervals} real serial intervals (${m.pagesMeasured} pages over ${m.activeMin} active min, ${m.idleSkipped} idle gaps skipped)`);
    console.log(`[measure] MEASURED serial rate: ${m.pagesPerMinPerWorker} pages/min/worker`);
    console.log(`[measure] ${describeProfile(profile)}`);
    console.log(`[measure] OLLAMA_NUM_PARALLEL=${ollamaParallel ?? "unset(unverified)"} → effective ${p.effectiveWorkers}× workers → ${p.concurrencySpeedup}× vs serial`);
    console.log(`[measure] ${artifact.note}`);
    console.log(`[measure] ${artifact.action}`);
  }
  exit(0);
}

const isMainModule = argv[1] && fileURLToPath(import.meta.url) === resolve(argv[1]);
if (isMainModule) {
  try { main(); }
  catch (e) { console.error("[measure] FATAL: " + (e instanceof Error ? e.message : String(e))); exit(1); }
}
