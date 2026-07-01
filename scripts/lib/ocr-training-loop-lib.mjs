// scripts/lib/ocr-training-loop-lib.mjs
//
// U-XRAY-OCR-TRAINING-LOOP — closed-loop OCR training-data engine (pure core).
//
// WHY (ready-now, no delta): the full print→CAD→gcode→CAD-gen loop is gated on delta's CAD-gen,
// but the print-READING stage trains TODAY. The multi-VLM ensemble (vision-ensemble-fuse.mjs) is a
// TEACHER: run it over real prints and the dims models corroborate are high-confidence pseudo-labels.
// The hard ML question (the "garbage in, garbage out" pitfall) is: HOW MUCH do we trust a pseudo-label
// given its agreement? This lib answers it empirically, then grades labels:
//
//   1. CALIBRATE — on perfect-GT synthetic prints, measure P(a consensus dim is CORRECT | its
//      AGREEMENT FRACTION f = k/n_models). Calibrating on the FRACTION (not raw count k) is the key
//      correctness property: k=2 means different things in a 2-model vs a 3-model run, but f="how much
//      of the ensemble agreed" is ensemble-size-invariant — so a calibration stays valid even when
//      fleet contention changes how many models survive per print. Isotonic-regressed monotone in f
//      (more agreement ⇒ not less accurate). Only prints with n_models≥2 contribute (a 1-model run
//      has NO corroboration signal). (R9: the trust is MEASURED against ground truth, not assumed.)
//   2. TIER — map each real pseudo-label's f → expected accuracy → gold/silver/bronze/reject. A label
//      is trainable ONLY if its print had n_models≥2 (real corroboration) AND it clears the trust floor.
//      The rest → active-learning queue (operator-confirm), NEVER silently trained on (R12).
//
// Reuses poolAdjacentViolators + MIN_RELIABLE_SAMPLES from isotonic-calibrator.mjs (single-sources the
// PAV math). PURE: no fs/fetch/VLM. The runner supplies per-dim correctness (vs GT) for calibration
// and per-dim {corroboration, n_models} for tiering.

import { poolAdjacentViolators, MIN_RELIABLE_SAMPLES } from "./isotonic-calibrator.mjs";

// Expected-accuracy floors per label tier. A dim whose calibrated P(correct|f) clears the floor earns
// the tier. Conservative: only ≥0.85-accurate labels are "gold" (train unweighted); silver/bronze are
// down-weighted; below bronze → reject → active-learning queue.
export const DEFAULT_TIER_THRESHOLDS = Object.freeze({ gold: 0.85, silver: 0.65, bronze: 0.45 });

// A print needs at least this many models to produce ANY corroboration signal — a single-model run's
// "agreement" is the model agreeing with itself (meaningless). Labels from n_models < this are never
// trainable (routed to active-learning instead).
export const MIN_ENSEMBLE_FOR_CORROBORATION = 2;

/** Round an agreement fraction to a stable bin key (avoids float-equality drift across 1/3, 2/3, …). */
function fracKey(f) { return +Number(f).toFixed(4); }

/**
 * Pure: calibrate P(consensus dim correct | agreement fraction f) from labeled samples.
 * @param {Array<{f:number, correct:boolean}>} samples  one per consensus dim from synthetic-GT runs
 *   (caller computes f = corroboration / n_models, and supplies ONLY dims from n_models≥2 prints).
 * @returns {{ byF: Array<{f,n,correct,raw,isotonic}>, totalN:number, minF:(number|null),
 *            maxF:(number|null), calibrated:boolean, reliable:boolean, minReliableSamples:number }}
 */
export function calibrateAgreement(samples) {
  const rows = (Array.isArray(samples) ? samples : []).filter((s) => s && Number.isFinite(s.f) && s.f > 0 && s.f <= 1);
  const agg = new Map(); // fKey → {n, correct}
  for (const s of rows) {
    const f = fracKey(s.f);
    const a = agg.get(f) || { n: 0, correct: 0 };
    a.n += 1; if (s.correct === true) a.correct += 1;
    agg.set(f, a);
  }
  const fs = [...agg.keys()].sort((a, b) => a - b);
  const bins = fs.map((f) => ({ f, n: agg.get(f).n, correct: agg.get(f).correct }));
  // PAV (shared primitive) over ascending-f points weighted by n; map pooled blocks back to each f.
  const blocks = poolAdjacentViolators(bins.map((b) => ({ y: b.correct / b.n, w: b.n })));
  const isoByF = new Map();
  let bi = 0;
  for (const blk of blocks) { for (let c = 0; c < blk.count && bi < bins.length; c++) { isoByF.set(bins[bi].f, blk.y); bi++; } }
  const byF = bins.map((b) => ({ f: b.f, n: b.n, correct: b.correct, raw: +(b.correct / b.n).toFixed(4), isotonic: +isoByF.get(b.f).toFixed(4) }));
  return {
    byF,
    totalN: rows.length,
    minF: fs.length ? fs[0] : null,
    maxF: fs.length ? fs[fs.length - 1] : null,
    calibrated: byF.length > 0,
    reliable: byF.length > 0 && rows.length >= MIN_RELIABLE_SAMPLES,
    minReliableSamples: MIN_RELIABLE_SAMPLES,
  };
}

/**
 * Pure: expected accuracy (calibrated P(correct)) for agreement fraction f. Uses the isotonic estimate.
 * f above the observed max → clamp to max-f's value; below min → min-f's value; between observed fs →
 * nearest-LOWER (conservative); uncalibrated → null (NEVER fabricate a trust value).
 * @param {number} f  agreement fraction in (0,1]
 * @param {object} calibration  calibrateAgreement output
 * @returns {number|null}
 */
export function expectedAccuracyForFraction(f, calibration) {
  const byF = calibration && Array.isArray(calibration.byF) ? calibration.byF : [];
  if (!byF.length || !Number.isFinite(f)) return null;
  const key = fracKey(f);
  const exact = byF.find((b) => b.f === key);
  if (exact) return exact.isotonic;
  if (key > byF[byF.length - 1].f) return byF[byF.length - 1].isotonic; // clamp high
  if (key < byF[0].f) return byF[0].isotonic;                            // clamp low
  let lo = byF[0].isotonic;
  for (const b of byF) { if (b.f <= key) lo = b.isotonic; else break; }   // nearest-lower
  return lo;
}

/**
 * Pure: tier one pseudo-label by its agreement fraction against the calibration.
 * @param {number} f  agreement fraction = corroboration / n_models
 * @param {object} calibration
 * @param {{thresholds?:object}} [opts]
 * @returns {{tier:"gold"|"silver"|"bronze"|"reject"|"uncalibrated", expectedAccuracy:(number|null), f:number}}
 */
export function assignLabelTier(f, calibration, opts = {}) {
  const th = { ...DEFAULT_TIER_THRESHOLDS, ...(opts.thresholds || {}) };
  const acc = expectedAccuracyForFraction(f, calibration);
  if (acc == null) return { tier: "uncalibrated", expectedAccuracy: null, f };
  let tier;
  if (acc >= th.gold) tier = "gold";
  else if (acc >= th.silver) tier = "silver";
  else if (acc >= th.bronze) tier = "bronze";
  else tier = "reject";
  return { tier, expectedAccuracy: acc, f };
}

/**
 * Pure: render a GD&T feature-control-frame entry to a canonical ASCII ground-truth string for the
 * LoRA pair (the GD&T analogue of a dimension's value_mm). Format:
 *   "<symbol> <tolerance><unit> <material_condition> [<datumA>|<datumB>]"
 * Empty/absent parts are dropped; falls back to verbatim raw_text if nothing structured is present.
 * Deterministic (no Math.random); used both to stamp fcf_text on the label and as the pair groundTruth.
 * @param {object} g  a fused.gdt entry (symbol/tolerance_value/tolerance_unit/material_condition/datum_references/raw_text)
 * @returns {string}
 */
export function buildFcfText(g) {
  if (!g || typeof g !== "object") return "";
  const sym = g.symbol != null ? String(g.symbol).trim() : "";
  const tol = Number.isFinite(g.tolerance_value) ? String(g.tolerance_value) : "";
  const unit = g.tolerance_unit != null && String(g.tolerance_unit).trim() ? String(g.tolerance_unit).trim() : "";
  const mc = g.material_condition != null && String(g.material_condition).trim() ? String(g.material_condition).trim() : "";
  const datums = Array.isArray(g.datum_references)
    ? g.datum_references.map((d) => (d == null ? "" : String(d).trim())).filter(Boolean)
    : [];
  const parts = [];
  if (sym) parts.push(sym);
  if (tol) parts.push(unit ? `${tol}${unit}` : tol);
  if (mc) parts.push(mc);
  let s = parts.join(" ");
  if (datums.length) s += `${s ? " " : ""}[${datums.join("|")}]`;
  s = s.trim();
  if (!s && g.raw_text != null) s = String(g.raw_text).trim();
  return s;
}

/**
 * Pure: build a supervised trainset row from one print's fused ensemble result. Each consensus dim is
 * tiered by its agreement fraction. A label is TRAINABLE only if (a) its print had n_models ≥
 * MIN_ENSEMBLE_FOR_CORROBORATION (real corroboration was possible) AND (b) its tier is gold/silver.
 * This closes the calibration-domain leak: a single-model run (n_models<2, fraction always 1.0 by
 * self-agreement) can NEVER mint trainable labels.
 * @param {{part:string, image:string}} part
 * @param {{dimensions:Array, summary:object}} fused  fuseEnsemble output
 * @param {object} calibration
 * @param {{thresholds?:object}} [opts]
 * @returns {object} trainset row
 */
export function buildTrainsetRow(part, fused, calibration, opts = {}) {
  const dims = fused && Array.isArray(fused.dimensions) ? fused.dimensions : [];
  const runNModels = fused && fused.summary && Number.isFinite(fused.summary.n_models) ? fused.summary.n_models : 0;
  const corroborationPossible = runNModels >= MIN_ENSEMBLE_FOR_CORROBORATION;
  const labels = dims.map((d) => {
    const nm = Number.isFinite(d.n_models) && d.n_models > 0 ? d.n_models : runNModels;
    const f = nm > 0 ? d.corroboration / nm : 0;
    const base = {
      type: d.type, value_mm: d.value_mm, corroboration: d.corroboration, n_models: nm,
      agreement_fraction: +f.toFixed(4), agreement_confidence: d.agreement_confidence, value_spread_mm: d.value_spread_mm,
    };
    // A single-model run has no agreement signal — f=1.0 is the model agreeing with itself, NOT
    // corroboration. Such a dim is honestly "no_corroboration" (never an accuracy tier), never trainable.
    if (!corroborationPossible) return { ...base, tier: "no_corroboration", expected_accuracy: null, trainable: false };
    const t = assignLabelTier(f, calibration, { thresholds: opts.thresholds });
    return { ...base, tier: t.tier, expected_accuracy: t.expectedAccuracy, trainable: t.tier === "gold" || t.tier === "silver" };
  });
  const counts = labels.reduce((m, l) => { m[l.tier] = (m[l.tier] || 0) + 1; return m; }, {});
  // GD&T trainable labels (U-XRAY-GDT-LABEL-TIER): tier each consensus GD&T frame by the SAME
  // corroboration gate + agreement-fraction calibration the dimensions use, so a frame >=2 models
  // agree on becomes a trainable label (mirrors the dim path exactly). calibration_basis is flagged
  // "dimension-agreement" (R12): the isotonic curve is dimension-derived, NOT GD&T-specific -- a
  // per-feature-type calibration is a separate future unit; never claim GD&T-specific accuracy here.
  const gdtArr = fused && Array.isArray(fused.gdt) ? fused.gdt : [];
  const gdt_labels = gdtArr.map((g) => {
    const nm = Number.isFinite(g.n_models) && g.n_models > 0 ? g.n_models : runNModels;
    const corr = Number.isFinite(g.corroboration) ? g.corroboration : 0;
    const f = nm > 0 ? corr / nm : 0;
    const base = {
      symbol: g.symbol != null ? String(g.symbol) : null,
      tolerance_value: Number.isFinite(g.tolerance_value) ? g.tolerance_value : null,
      datum_references: Array.isArray(g.datum_references) ? g.datum_references : [],
      fcf_text: buildFcfText(g),
      corroboration: corr, n_models: nm, agreement_fraction: +f.toFixed(4),
      hallucination_candidate: g.hallucination_candidate === true,
      calibration_basis: "dimension-agreement",
    };
    // Same gate as dims: a single-model run (no corroboration possible) mints ZERO trainable labels.
    if (!corroborationPossible) return { ...base, tier: "no_corroboration", expected_accuracy: null, trainable: false };
    const t = assignLabelTier(f, calibration, { thresholds: opts.thresholds });
    return { ...base, tier: t.tier, expected_accuracy: t.expectedAccuracy, trainable: t.tier === "gold" || t.tier === "silver" };
  });
  return {
    part: part && part.part != null ? String(part.part) : null,
    image: part && part.image != null ? String(part.image) : null,
    n_models: runNModels,
    corroboration_possible: corroborationPossible,
    labels,
    trainable_label_count: labels.filter((l) => l.trainable).length,
    tier_counts: counts,
    // GD&T trainable labels (tiered like dims; trainable = corroboration-possible + gold/silver).
    gdt_labels,
    trainable_gdt_label_count: gdt_labels.filter((l) => l.trainable).length,
    // Non-dimension coverage the ensemble captured (fuseEnsemble unions gdt/notes/profiles/
    // surface_finishes; previously dropped, so this was silently zero). Records GD&T/notes/
    // profile/finish reach in the closed-loop corpus so it is no longer dimension-only.
    gdt_count: fused && Array.isArray(fused.gdt) ? fused.gdt.length : 0,
    note_count: fused && Array.isArray(fused.notes) ? fused.notes.length : 0,
    profile_count: fused && Array.isArray(fused.profiles) ? fused.profiles.length : 0,
    surface_finish_count: fused && Array.isArray(fused.surface_finishes) ? fused.surface_finishes.length : 0,
    source: "ensemble-distillation",
  };
}

/**
 * Pure: should this print go to the operator active-learning queue (not auto-trained)?
 * Triggers: single-model run (no corroboration possible), ANY ambiguous pair, ANY hallucination
 * candidate, OR no trainable labels. Returns the reasons.
 * @param {{fused:object, trainsetRow:object}} perPart
 * @returns {{needsReview:boolean, reasons:string[]}}
 */
export function classifyActiveLearning(perPart) {
  const fused = perPart && perPart.fused ? perPart.fused : {};
  const row = perPart && perPart.trainsetRow ? perPart.trainsetRow : {};
  const summary = fused.summary || {};
  const reasons = [];
  const nModels = Number.isFinite(summary.n_models) ? summary.n_models : (row.n_models || 0);
  if (nModels < MIN_ENSEMBLE_FOR_CORROBORATION) reasons.push(`single-model run (n_models=${nModels}) — no corroboration signal, cannot weak-label`);
  if ((summary.n_ambiguous_pairs || 0) > 0) reasons.push(`${summary.n_ambiguous_pairs} ambiguous pair(s) — model value-disagreement`);
  if ((summary.n_hallucination_candidates || 0) > 0) reasons.push(`${summary.n_hallucination_candidates} hallucination candidate(s)`);
  if ((row.trainable_label_count || 0) === 0) reasons.push("no gold/silver labels — every dim below trust floor or no corroboration");
  return { needsReview: reasons.length > 0, reasons };
}

/**
 * Pure: roll up a full training-loop pass into a report.
 * @param {Array<{trainsetRow:object, activeLearning:object}>} perPartResults
 * @param {object} calibration
 * @returns {object}
 */
export function aggregateTrainingLoop(perPartResults, calibration) {
  const parts = Array.isArray(perPartResults) ? perPartResults : [];
  const tierTotals = { gold: 0, silver: 0, bronze: 0, reject: 0, uncalibrated: 0 };
  let totalLabels = 0, trainableLabels = 0, alQueue = 0;
  // Non-dimension coverage rolled up across the run (gdt/notes/profiles/finish the ensemble read).
  const nonDim = { gdt: 0, notes: 0, profiles: 0, surface_finishes: 0 };
  let trainableGdtLabels = 0; // GD&T frames that tiered gold/silver (corroboration-possible)
  for (const p of parts) {
    const row = p.trainsetRow || {};
    for (const l of row.labels || []) { tierTotals[l.tier] = (tierTotals[l.tier] || 0) + 1; totalLabels++; if (l.trainable) trainableLabels++; }
    if (p.activeLearning && p.activeLearning.needsReview) alQueue++;
    nonDim.gdt += row.gdt_count || 0;
    nonDim.notes += row.note_count || 0;
    nonDim.profiles += row.profile_count || 0;
    nonDim.surface_finishes += row.surface_finish_count || 0;
    trainableGdtLabels += row.trainable_gdt_label_count || 0;
  }
  return {
    parts: parts.length,
    total_labels: totalLabels,
    trainable_labels: trainableLabels,
    trainable_yield: totalLabels ? +(trainableLabels / totalLabels).toFixed(4) : 0,
    tier_totals: tierTotals,
    active_learning_queue: alQueue,
    non_dim_coverage: nonDim,
    trainable_gdt_labels: trainableGdtLabels,
    calibration: calibration ? { calibrated: calibration.calibrated, reliable: calibration.reliable, totalN: calibration.totalN, byF: calibration.byF } : null,
  };
}

// ── RESUME CURSOR (STEP 1 — reaper-survivable corpus runs, R14/R12) ──────────
// Corpus-scale weak-labeling MUST survive a fleet-reaper kill mid-run (the host reaps long
// node/python under load — see reference_blackwell_gpu_training_ready_2026_06_06). The old runner
// held every print's result in memory and writeFileSync'd ONCE at the end → a kill at print N/M lost
// ALL N and restarted at print 1 → a non-terminating GPU burn that LOOKS like progress (RISK 1).
// The fix is a per-print append cursor: each completed print writes one cursor line (key = its
// resolved identity), and a restart skips every key already in the cursor (re-OCR count = 0). These
// are the PURE helpers; the runner supplies the actual O_APPEND fs writes.

/**
 * Pure: the stable identity of a print for the resume cursor. Two paths to the SAME print (the JM
 * corpus stores one drawing at many paths) must collapse to one key so a restart never re-OCRs a
 * print just because it was reached via a different path. Uses basename (lowercased) — the same
 * de-dup key build-blueprint-ocr-worklist.mjs already uses for the worklist (single source of the
 * identity convention). Empty/blank → null (caller treats as "always process", never cursor-skips).
 * @param {string} pngOrPath
 * @returns {string|null}
 */
export function printCursorKey(pngOrPath) {
  const s = String(pngOrPath == null ? "" : pngOrPath).trim();
  if (!s) return null;
  const fwd = s.split("\\").join("/");
  const base = fwd.slice(fwd.lastIndexOf("/") + 1);
  const key = base.trim().toLowerCase();
  return key || null;
}

/**
 * Pure: parse cursor-file CONTENTS (the full text of processed-cursor.jsonl) into a Set of done
 * keys. Each line is a JSON object `{key, ...}` — a malformed/blank line is SKIPPED (fail-soft: a
 * torn final line from a kill mid-write must not abort resume), never throws. A line missing a
 * usable key is ignored. This is the inverse of formatCursorLine.
 * @param {string} text
 * @returns {Set<string>}
 */
// Cursor statuses a re-run with a STRONGER model lineup could turn into a real label. Default resume
// treats them as done (re-running the SAME models just fails again); --retry-failed re-queues them so
// adding a better VLM (e.g. qwen3-vl:32b, the zulu ladder work-order) recovers the ~15% the 2-model
// ensemble could not read. NOT included: skipped-missing (file still absent), skipped-all-paperwork
// (a confident non-drawing classification -- a model upgrade won't change a blank/BOM page).
export const RETRYABLE_FAILURE_STATUSES = Object.freeze(new Set(["skipped-ensemble-failed", "skipped-rasterize-failed"]));

export function parseCursorDoneSet(text, opts = {}) {
  const retryFailed = !!(opts && opts.retryFailed);
  // A print may be cursored more than once (a kill mid-print leaves earlier lines; a retry re-records).
  // LAST status wins -- a print that was ensemble-failed then later labeled is DONE even under retry.
  const lastStatus = new Map();
  const lines = String(text == null ? "" : text).split(/\r?\n/);
  for (const line of lines) {
    const t = line.trim();
    if (!t) continue;
    let obj;
    try { obj = JSON.parse(t); } catch { continue; } // torn/partial line from a kill — skip, don't abort
    if (!obj || typeof obj !== "object") continue;
    const k = printCursorKey(obj.key != null ? obj.key : obj.image != null ? obj.image : obj.part);
    if (!k) continue;
    lastStatus.set(k, typeof obj.status === "string" && obj.status ? obj.status : "labeled");
  }
  const done = new Set();
  for (const [k, status] of lastStatus) {
    if (retryFailed && RETRYABLE_FAILURE_STATUSES.has(status)) continue; // re-queue a recoverable failure
    done.add(k);
  }
  return done;
}

/**
 * Pure: one newline-terminated cursor line for a completed print. status records WHY a print is done
 * so a resume never re-runs it: "labeled" (produced rows), "skipped-missing"/"skipped-ensemble-failed"
 * (no rows but legitimately attempted — re-running would just fail again). Carries the trainable count
 * for a cheap progress tally without re-reading trainset.jsonl. ts is INJECTED (Date.now is unavailable
 * in some contexts and pure fns must be deterministic in tests).
 * @param {{key:string, status:string, trainable?:number, n_models?:number, ts?:string}} a
 * @returns {string}  JSON + "\n"
 */
export function formatCursorLine(a) {
  const key = printCursorKey(a && a.key);
  const rec = {
    key,
    status: a && typeof a.status === "string" && a.status ? a.status : "labeled",
    trainable: a && Number.isFinite(a.trainable) ? a.trainable : 0,
    n_models: a && Number.isFinite(a.n_models) ? a.n_models : 0,
  };
  if (a && typeof a.ts === "string" && a.ts) rec.ts = a.ts;
  return JSON.stringify(rec) + "\n";
}

/**
 * Pure: split a worklist into {todo, skipped} given the resume done-set. Order-preserving. A print
 * whose key is in `done` is skipped (already processed); a null-key entry (blank path) is also
 * skipped from todo (can't be cursored — caller logs it). De-dups within the worklist itself so the
 * same print listed twice is processed once.
 * @param {string[]} worklist  print paths/PNGs
 * @param {Set<string>} done   from parseCursorDoneSet
 * @returns {{todo:string[], skipped:string[], skippedDone:number, skippedNullKey:number,
 *            skippedWorklistDup:number, skippedCursorDone:number, distinctTotal:number}}
 *   distinctTotal is the TRUE corpus denominator (count of distinct basename keys), NOT
 *   worklist.length -- the corpus is 100%-complete when skippedCursorDone === distinctTotal
 *   (every distinct print processed). skippedDone is retained as the back-compat SUM of
 *   skippedWorklistDup (re-filed-scan basename duplicates) + skippedCursorDone (prior-run progress).
 */
export function partitionByResumeCursor(worklist, done) {
  const list = Array.isArray(worklist) ? worklist : [];
  const doneSet = done instanceof Set ? done : new Set();
  const todo = [];
  const skipped = [];
  const seen = new Set();
  // Split the two distinct "skip" reasons that were previously folded into one counter:
  //   skippedWorklistDup -- same basename listed more than once in the worklist (a re-filed scan;
  //                         correct dedup, NOT lost coverage).
  //   skippedCursorDone  -- basename already in the resume cursor (genuine prior-run progress).
  // Conflating them hid the true denominator: a watcher seeing "294 already-done" against a 56-key
  // cursor could not tell 276 dedup from ~18 real progress, nor read how close the corpus is to 100%.
  let skippedWorklistDup = 0, skippedCursorDone = 0, skippedNullKey = 0;
  for (const item of list) {
    const k = printCursorKey(item);
    if (!k) { skippedNullKey++; continue; }
    if (seen.has(k)) { skippedWorklistDup++; skipped.push(item); continue; } // duplicate basename within worklist (re-filed scan)
    seen.add(k);
    if (doneSet.has(k)) { skippedCursorDone++; skipped.push(item); continue; } // already processed in a prior run (resume)
    todo.push(item);
  }
  return {
    todo, skipped, skippedNullKey,
    skippedWorklistDup, skippedCursorDone,
    skippedDone: skippedWorklistDup + skippedCursorDone, // back-compat: the prior single counter (sum)
    distinctTotal: seen.size,                            // TRUE corpus denominator (distinct basenames)
  };
}

/**
 * Pure: is the corpus fully drained? True iff the worklist names at least one distinct print AND every
 * distinct print is already in the resume cursor (todo === 0). Backs the runner's --until-complete
 * fast-exit (operator 2026-06-19 "do it all until complete"): a frequent backstop relaunch on an
 * already-complete corpus exits 0 WITHOUT re-running calibration, so a continuous scheduled task can
 * idle cheaply once done. An empty/blank worklist returns FALSE (never claim a missing corpus "drained"
 * -- a misconfigured run must fall through to its normal fail-loud path, not silently no-op). R12.
 * @param {string[]} worklistEntries  print paths (caller has already stripped comment/blank lines)
 * @param {Set<string>} done  cursor done-set (from parseCursorDoneSet)
 * @returns {boolean}
 */
export function isCorpusDrained(worklistEntries, done) {
  const { todo, distinctTotal } = partitionByResumeCursor(worklistEntries, done);
  return distinctTotal > 0 && todo.length === 0;
}
