#!/usr/bin/env node
/**
 * cad-self-check-sweep.mjs (U-DELTA-CAD-SELF-CHECK-SWEEP, slot:delta 2026-06-29)
 *
 * The ENGINEERED CLOSED-LOOP HARNESS the operator asked for: run the feature-aware 2D self-check over the WHOLE
 * generated-part corpus and ledger the accuracy. For each generated part (state/shared/cad-text-gen/<slug>/):
 *   request.json --(parseRequestPrint "decipher the print")--> ground-truth PrintDim[] (envelope + features)
 *   model.step   --(partSpecFromStepText -> dimsFromPartSpec)--> generated PrintDim[]
 *               --(runSelfCheck)--> verdict {accurate, missing/extra feature, bbox-advisory}
 *
 * This validates the Stage-0 self-check at corpus scale and surfaces FEATURE-level defects (a missing hole) that
 * the bbox-only cad-gen-accuracy.mjs cannot see -- directly serving "ensure accuracy AND logic" / the 2-hole-
 * bracket class. OFFLINE (no Fusion): pure STEP extraction + the pure scorer. RESUMABLE: a durable per-part
 * ledger (skip-if-already-graded) so a reaper kill mid-run loses nothing -- the proven corpus-sweep pattern.
 *
 *   node scripts/cad-self-check-sweep.mjs [--limit 40] [--reset] [--json]
 *
 * gradeOnePart + aggregateSweep are pure + exported + unit-tested; main() does the resumable IO loop.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseRequestPrint } from "./cad-request-print.mjs";
import { partSpecFromStepText, runSelfCheck } from "./cad-self-check.mjs";
import { dimsFromPartSpec } from "./cad-print-dims.mjs";
import { mfgInterpretation, ROUND_SHAPES } from "./cad-mfg-logic.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CORPUS_DIR = path.join(ROOT, "state", "shared", "cad-text-gen");
const LEDGER = path.join(ROOT, "state", "shared", "cad-fusion-live", "self-check-sweep-ledger.jsonl");
const SUMMARY = path.join(ROOT, "state", "shared", "cad-fusion-live", "self-check-sweep-summary.json");

/**
 * Grade ONE generated part: decipher its request -> ground-truth dims, extract the STEP -> generated dims, run
 * the self-check. Returns a row {label, accurate, score, missingCount, extraCount, bboxAdvisory, ...} or, when
 * the request states no dimensions, {label, skipped:"unparseable-request"} (can't grade without ground truth --
 * surfaced, never counted as a pass). Pure given text inputs (no IO). Never throws on bad geometry/text.
 */
export function gradeOnePart({ label, requestText, stepText, relTol } = {}) {
  const gt = parseRequestPrint(requestText || "");
  if (!gt.dims.length) return { label, request: requestText || null, skipped: "unparseable-request" };
  let spec;
  try { spec = partSpecFromStepText(stepText || "", { label }); }
  catch (e) { return { label, request: requestText, skipped: "step-extract-failed", reason: String(e?.message ?? e) }; }
  const partDims = dimsFromPartSpec(spec);
  if (!partDims.length) return { label, request: requestText, skipped: "no-part-dims", geometryClass: spec.geometryClass };
  const v = runSelfCheck({ printDims: gt.dims, partDims, relTol, bboxReliable: spec.bboxReliable });
  // Stage-2 manufacturing-logic coverage (U-DELTA-CAD-MFG-LOGIC): decipher -> stock body + workholding.
  // Request-derived (gt.dims), so it's reported alongside the dimensional verdict. Compact ledger row.
  const mfg = mfgInterpretation(gt, { process: ROUND_SHAPES.has(gt.shape) ? "lathe" : "mill" });
  return {
    label, request: requestText, shape: gt.shape, geometryClass: spec.geometryClass,
    accurate: v.accurate, score: v.score, dimAccuracy: v.dimAccuracy, completeness: v.completeness,
    missingCount: v.missingCount, extraCount: v.extraCount, bboxReliable: v.bboxReliable, bboxAdvisory: v.bboxAdvisory,
    missing: v.missing, failures: v.failures,
    mfg: mfg.applicable
      ? { applicable: true, process: mfg.process, stockApplicable: mfg.stock.applicable, internalFeatureCount: mfg.stock.internalFeatures?.length ?? 0, workholdApplicable: mfg.workholding.applicable, warningCount: mfg.workholding.warnings.length }
      : { applicable: false },
  };
}

/** Aggregate sweep rows -> accuracy + defect distribution. Pure. */
export function aggregateSweep(rows) {
  const r = (Array.isArray(rows) ? rows : []).filter(Boolean);
  const skipped = r.filter((x) => x.skipped);
  const graded = r.filter((x) => !x.skipped);
  const accurate = graded.filter((x) => x.accurate);
  const reliable = graded.filter((x) => x.bboxReliable);     // planar/prismatic: envelope verdict is authoritative
  const reliableAccurate = reliable.filter((x) => x.accurate);
  // Stage-2 mfg-logic coverage over the graded parts (how many got a stock body + workholding plan).
  const withMfg = graded.filter((x) => x.mfg && x.mfg.applicable);
  return {
    total: r.length,
    graded: graded.length,
    accurate: accurate.length,
    accuracyRate: graded.length ? Math.round((accurate.length / graded.length) * 1e4) / 1e4 : null,
    reliableGraded: reliable.length,
    reliableAccuracyRate: reliable.length ? Math.round((reliableAccurate.length / reliable.length) * 1e4) / 1e4 : null,
    withMissingFeature: graded.filter((x) => x.missingCount > 0).length,
    withExtraFeature: graded.filter((x) => x.extraCount > 0).length,
    bboxAdvisory: graded.filter((x) => x.bboxAdvisory).length,
    unparseableRequest: skipped.filter((x) => x.skipped === "unparseable-request").length,
    otherSkipped: skipped.filter((x) => x.skipped !== "unparseable-request").length,
    mfgApplicable: withMfg.length,
    mfgWithWorkholding: withMfg.filter((x) => x.mfg.workholdApplicable).length,
    mfgWithWarnings: withMfg.filter((x) => x.mfg.warningCount > 0).length,
  };
}

/**
 * Dedupe generated parts by REQUEST, keeping only the NEWEST generation of each. The corpus accumulates a new
 * timestamped dir (`<slug>-<ms>`) every time a request is regenerated, so an old buggy generation and a newer
 * fixed one coexist; grading both lets stale pre-fix duplicates drag the number down and misrepresents the
 * CURRENT generator. Group by slug (= slugified request), keep the max trailing-timestamp. Pure (label-only).
 */
export function newestPerRequest(parts) {
  const byKey = new Map();
  for (const p of Array.isArray(parts) ? parts : []) {
    const m = String(p.label).match(/^(.*)-(\d{10,})$/); // "<slug>-<Date.now()>"
    const key = m ? m[1] : p.label;
    const ts = m ? Number(m[2]) : 0;
    const prev = byKey.get(key);
    if (!prev || ts > prev.ts) byKey.set(key, { part: p, ts });
  }
  return [...byKey.values()].map((v) => v.part);
}

/** List corpus part dirs that have BOTH model.step + request.json. */
function listCorpusParts(dir) {
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }).filter((d) => d.isDirectory()); } catch { return []; }
  const parts = [];
  for (const d of entries) {
    const stepP = path.join(dir, d.name, "model.step");
    const reqP = path.join(dir, d.name, "request.json");
    if (fs.existsSync(stepP) && fs.existsSync(reqP)) parts.push({ label: d.name, stepPath: stepP, reqPath: reqP });
  }
  return parts.sort((a, b) => a.label.localeCompare(b.label)); // deterministic order
}

/** Read the set of already-graded labels from the durable ledger (resume). */
function processedLabels(ledgerPath) {
  const seen = new Set();
  try { for (const line of fs.readFileSync(ledgerPath, "utf8").split(/\r?\n/)) { if (!line) continue; try { const o = JSON.parse(line); if (o.label) seen.add(o.label); } catch { /* skip torn line */ } } } catch { /* no ledger yet */ }
  return seen;
}

async function main() {
  const args = process.argv.slice(2);
  const get = (n, d) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const asJson = args.includes("--json");
  const limit = parseInt(get("--limit", "0"), 10) || 0;
  const relTol = parseFloat(get("--tol", "0.02")) || 0.02;
  if (args.includes("--reset")) { try { fs.rmSync(LEDGER); } catch { /* already gone */ } }
  fs.mkdirSync(path.dirname(LEDGER), { recursive: true });

  const allDirs = listCorpusParts(CORPUS_DIR);
  // grade only the NEWEST generation per request unless --all-generations (drops stale pre-fix duplicates)
  const all = args.includes("--all-generations") ? allDirs : newestPerRequest(allDirs);
  const dupesDropped = allDirs.length - all.length;
  const done = processedLabels(LEDGER);
  const todo = all.filter((p) => !done.has(p.label));
  const batch = limit ? todo.slice(0, limit) : todo;

  let graded = 0;
  for (const p of batch) {
    let requestText = null, stepText = "";
    try { requestText = JSON.parse(fs.readFileSync(p.reqPath, "utf8")).request; } catch { /* leave null -> unparseable */ }
    try { stepText = fs.readFileSync(p.stepPath, "utf8"); } catch { /* empty -> no-part-dims */ }
    const row = gradeOnePart({ label: p.label, requestText, stepText, relTol });
    fs.appendFileSync(LEDGER, JSON.stringify(row) + "\n"); // durable BEFORE any further work (resume-safe)
    graded++;
    if (!asJson) process.stderr.write(`  ${row.skipped ? "SKIP" : row.accurate ? "OK " : "BAD"} ${String(p.label).slice(0, 50).padEnd(50)} ${row.skipped || `score ${(100 * row.score).toFixed(0)}% miss ${row.missingCount} extra ${row.extraCount}${row.bboxAdvisory ? " ~bbox-advisory" : ""}`}\n`);
  }

  // full-ledger summary (this run + all prior resumed rows)
  const allRows = [];
  try { for (const line of fs.readFileSync(LEDGER, "utf8").split(/\r?\n/)) { if (line) try { allRows.push(JSON.parse(line)); } catch { /* skip */ } } } catch { /* none */ }
  const summary = aggregateSweep(allRows);
  const out = { schemaVersion: "1.0.0", corpusDirs: allDirs.length, uniqueRequests: all.length, staleDuplicatesDropped: dupesDropped, processedThisRun: graded, remaining: Math.max(0, todo.length - graded), ...summary };
  try { fs.writeFileSync(SUMMARY, JSON.stringify(out, null, 2) + "\n"); } catch (e) { process.stderr.write(`summary write warn: ${e.message}\n`); }

  if (asJson) { process.stdout.write(JSON.stringify(out, null, 2) + "\n"); return; }
  process.stdout.write(`\n[CAD-SELF-CHECK-SWEEP] ${all.length} unique requests (${allDirs.length} dirs, ${dupesDropped} stale dupes dropped) · this run ${graded} · remaining ${out.remaining}\n`);
  process.stdout.write(`  graded ${summary.graded}: ${summary.accurate} accurate (${summary.accuracyRate == null ? "n/a" : (100 * summary.accuracyRate).toFixed(0) + "%"}); reliable-bbox ${summary.reliableGraded}: ${summary.reliableAccuracyRate == null ? "n/a" : (100 * summary.reliableAccuracyRate).toFixed(0) + "%"}\n`);
  process.stdout.write(`  defects: ${summary.withMissingFeature} missing-feature · ${summary.withExtraFeature} extra-feature · ${summary.bboxAdvisory} bbox-advisory · ${summary.unparseableRequest} unparseable-request · ${summary.otherSkipped} other-skip\n`);
  process.stdout.write(`  mfg-logic: ${summary.mfgApplicable} with a stock+workholding plan · ${summary.mfgWithWorkholding} workholdable · ${summary.mfgWithWarnings} flagged (thin/short-grip)\n`);
  process.stdout.write(`  ledger: ${LEDGER}\n`);
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) main().catch((e) => { process.stderr.write(`${e?.stack ?? e}\n`); process.exit(1); });
