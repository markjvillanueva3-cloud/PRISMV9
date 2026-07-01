#!/usr/bin/env node
// scripts/ollama-capability-probe-permodel.mjs
//
// U-ALPHA-OLLAMA-PROBE-PERMODEL (slot:alpha 2026-06-25): the ROBUST capability-probe orchestrator.
// PROVEN DEFECT (this session, fleet idle): `ollama-capability-probe.mjs` run over ALL 9 models in
// ONE process scores the COLD-LOAD big models (32b/30b/120b/r1) FALSE-0, while the SAME models score
// real non-zero rates when probed SINGLE-model (gpt-oss:20b: classify 100%/arith 67% solo, all-0 in
// the 9-model run). A 2-model run (1.5b+20b) also passes -- so the failure is a PROBLEMATIC big model
// (the held-resident 32b's num_ctx thrash, or 120b's can't-fit OOM) poisoning every model AFTER it in
// the shared run. The fix: spawn ONE child probe PER MODEL so a bad model fails in ITS OWN process and
// cannot zero the rest; merge the per-model matrices; apply the no-signal + outage guards; write the
// canonical matrix. Mirrors the proven per-model pattern in ollama-stress-expanded-run.mjs.
//
// Usage:
//   node scripts/ollama-capability-probe-permodel.mjs --out            # all DEFAULT_MODELS, write matrix
//   node scripts/ollama-capability-probe-permodel.mjs --models a,b --json
//   node scripts/ollama-capability-probe-permodel.mjs --per-timeout-ms 600000 --out

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { DEFAULT_MODELS, OUT, excludeNoSignalModels } from "./ollama-capability-probe.mjs";
import { autoOffloadCandidates } from "./lib/ollama-capability-battery.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PROBE = path.join(__dirname, "ollama-capability-probe.mjs");
const DEFAULT_PER_TIMEOUT_MS = 600000; // 10 min per model -- a cold-loading 65GB model + 8 tasks

/**
 * PURE: merge an array of single-model probe reports ({ models:[m], matrix:{taskId:{category,models:{m:{pass,total,rate}}}} })
 * into one matrix keyed by taskId with every model's cell. A model absent from a child report (it
 * crashed / timed out -> no JSON) simply contributes no cell -> it is NOT a false-0 (honest: unmeasured
 * != measured-0). Returns { models, matrix } in the same shape ollama-capability-probe.mjs writes.
 * @returns {{ models: string[], matrix: object }}
 */
export function mergeProbeMatrices(perModelReports) {
  const matrix = {};
  const models = [];
  const seen = new Set();
  for (const rep of perModelReports || []) {
    const mdl = Array.isArray(rep?.models) ? rep.models[0] : null;
    if (!mdl || seen.has(mdl)) continue;
    if (!rep.matrix || typeof rep.matrix !== "object") continue;
    seen.add(mdl);
    models.push(mdl);
    for (const [tid, t] of Object.entries(rep.matrix)) {
      const row = (matrix[tid] ||= { category: t?.category, models: {} });
      const cell = t?.models?.[mdl];
      if (cell) row.models[mdl] = cell;
    }
  }
  return { models, matrix };
}

/** Spawn a single-model child probe; return its parsed report or null (crash/timeout/bad-JSON). */
export function runOneModel(model, { perTimeoutMs = DEFAULT_PER_TIMEOUT_MS, spawnImpl = spawnSync } = {}) {
  const res = spawnImpl(process.execPath, [PROBE, "--models", model, "--json"], {
    timeout: perTimeoutMs, maxBuffer: 64 * 1024 * 1024, encoding: "utf8",
  });
  if (!res || res.status !== 0 || !res.stdout) return null;
  try { return JSON.parse(res.stdout); } catch { return null; }
}

async function main() {
  const args = process.argv.slice(2);
  const write = args.includes("--out");
  const asJson = args.includes("--json");
  const mIdx = args.indexOf("--models");
  const models = mIdx >= 0 && args[mIdx + 1] ? args[mIdx + 1].split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_MODELS;
  const tIdx = args.indexOf("--per-timeout-ms");
  const perTimeoutMs = tIdx >= 0 && args[tIdx + 1] ? Number(args[tIdx + 1]) : DEFAULT_PER_TIMEOUT_MS;

  process.stderr.write(`[probe-permodel] spawning ${models.length} single-model child probe(s), ${perTimeoutMs}ms each ...\n`);
  const reports = [];
  const failed = [];
  for (const m of models) {
    const r = runOneModel(m, { perTimeoutMs });
    if (r) { reports.push(r); process.stderr.write(`[probe-permodel] ${m} OK\n`); }
    else { failed.push(m); process.stderr.write(`[probe-permodel] ${m} FAILED (crash/timeout/bad-json) -- unmeasured, NOT recorded as 0\n`); }
  }
  if (reports.length === 0) { process.stderr.write("[probe-permodel] every child probe failed -- REFUSING to write (outage). Check the Ollama daemon.\n"); process.exitCode = 1; return; }

  const merged = mergeProbeMatrices(reports);
  // Same guards the single-process probe applies, on the merged matrix.
  const rawCells = Object.values(merged.matrix).flatMap((t) => Object.values(t.models));
  const allZero = rawCells.length > 0 && rawCells.every((s) => s.rate === 0);
  const { matrix, models: keptModels, excluded } = excludeNoSignalModels(merged.matrix, merged.models);
  // R12 transparency: a child probe whose ONLY model was all-0 (e.g. a deepseek-r1 reasoner that
  // fails every exact-match task) already self-excluded it -- so it never reaches mergeProbeMatrices
  // and would VANISH silently (not in models, not in `excluded`, not in `unmeasured`). Aggregate the
  // children's own excludedNoSignal so the operator sees WHY a measured-but-no-signal model is absent.
  const childExcluded = reports.flatMap((r) => (Array.isArray(r.excludedNoSignal) ? r.excludedNoSignal : []));
  const allExcluded = [...new Set([...excluded, ...childExcluded])];
  if (allExcluded.length) process.stderr.write(`[probe-permodel] excluded ${allExcluded.length} no-signal model(s): ${allExcluded.join(", ")}\n`);
  const safe = autoOffloadCandidates(matrix, 1.0);
  const strong = autoOffloadCandidates(matrix, 0.9);
  const report = { generatedAt: new Date().toISOString(), models: keptModels, matrix, autoOffloadSafe: safe, strong, excludedNoSignal: allExcluded, unmeasured: failed };

  if (write) {
    if (allZero) { process.stderr.write("[probe-permodel] every (task,model) cell scored 0 -- outage signature, REFUSING to overwrite (R12).\n"); process.exitCode = 1; return; }
    fs.mkdirSync(path.dirname(OUT), { recursive: true });
    fs.writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");
    process.stderr.write(`[probe-permodel] wrote ${OUT} (${keptModels.length} models measured, ${failed.length} unmeasured)\n`);
  }
  if (asJson) process.stdout.write(JSON.stringify(report, null, 2) + "\n");
  else process.stdout.write(`measured: ${keptModels.join(", ")}\nexcluded(no-signal): ${excluded.join(", ") || "none"}\nunmeasured(child-failed): ${failed.join(", ") || "none"}\n`);
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) main().catch((e) => { process.stderr.write(`[probe-permodel] FATAL ${e?.message || e}\n`); process.exitCode = 1; });
