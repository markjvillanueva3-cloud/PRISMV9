/**
 * cad-generation-quality-report.mjs -- honest convergence-quality report over the staged CAD generations
 * (slot:delta, U-CAD-GEN-QUALITY-REPORT). CONSUMES the precedent-check signal wired into the generation
 * loop (4cc7b0e142) -- otherwise that signal is an orphan (R15) -- and reports, over the generated parts
 * that actually exist: %executed, the geometric precedent archetype distribution + OUTLIER rate (parts that
 * resemble no proven corpus precedent), and the kernel-dim / self-check accuracy rates for the subset where
 * those were measured. It is the generation-lane slice of the eventual UNIT-0039 convergence audit -- SCOPED
 * to the gens (NOT a claim of full asset-class coverage), and R12 fail-loud: it enumerates anomalies and
 * counts only what was actually measured (a gen with no kernelAccuracy is "not measured", never "accurate").
 *
 * Precedent is computed FRESH from each model.step (via the wired precedentCheck), so the report covers
 * every executed gen regardless of when it was staged -- not only the ones re-run since the loop wire.
 *
 * @module scripts/cad-generation-quality-report
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HERE, "..");
const GEN_DIR = path.resolve(REPO_ROOT, "state/shared/cad-text-gen");

/**
 * Summarize generation rows. Each row: {slug, executed, hasStep, predictedClass?, isOutlier?, nearestSim?,
 * kernelAccurate?(true|false|null), selfCheckAccurate?(true|false|null)}. Pure -> node:test-able.
 * R12: `kernelAccurateRate` is over the MEASURED subset only (null/undefined = not measured, not a failure).
 */
export function summarizeGenerations(rows) {
  const list = Array.isArray(rows) ? rows : [];
  const executed = list.filter((r) => r.executed);
  const withPrecedent = list.filter((r) => r.predictedClass);
  const outliers = withPrecedent.filter((r) => r.isOutlier);
  const byPredictedClass = {};
  for (const r of withPrecedent) byPredictedClass[r.predictedClass] = (byPredictedClass[r.predictedClass] || 0) + 1;
  const measured = (key) => list.filter((r) => r[key] === true || r[key] === false);
  const rate = (num, den) => (den ? +(num / den).toFixed(3) : null);
  const kMeas = measured("kernelAccurate"), sMeas = measured("selfCheckAccurate");
  // Split the dim self-check by bbox RELIABILITY: prismatic parts have an EXACT point-cloud bbox (a real
  // dim-accuracy signal); curved parts (cylinders) are bbox-ADVISORY (the bbox under-measures a circular
  // diameter), so an "inaccurate" curved gen may be a MEASUREMENT limit, not a generation defect. Reporting
  // only the aggregate would misattribute the curved measurement gap as generation error (R12).
  const reliable = sMeas.filter((r) => r.selfCheckReliable === true);
  const advisory = sMeas.filter((r) => r.selfCheckReliable !== true);
  return {
    total: list.length,
    executed: executed.length,
    executedRate: list.length ? +(executed.length / list.length).toFixed(3) : 0,
    withStep: list.filter((r) => r.hasStep).length,
    precedentEvaluated: withPrecedent.length,
    byPredictedClass,
    outlierCount: outliers.length,
    outlierRate: withPrecedent.length ? +(outliers.length / withPrecedent.length).toFixed(3) : null,
    kernelMeasured: kMeas.length,
    kernelAccurateRate: rate(kMeas.filter((r) => r.kernelAccurate === true).length, kMeas.length),
    selfCheckMeasured: sMeas.length,
    selfCheckAccurateRate: rate(sMeas.filter((r) => r.selfCheckAccurate === true).length, sMeas.length),
    // the HONEST split: EXACT (prismatic) is real dim-accuracy; ADVISORY (curved) is measurement-limited
    selfCheckExactMeasured: reliable.length,
    selfCheckExactAccurateRate: rate(reliable.filter((r) => r.selfCheckAccurate === true).length, reliable.length),
    selfCheckAdvisoryMeasured: advisory.length,
    selfCheckAdvisoryAccurateRate: rate(advisory.filter((r) => r.selfCheckAccurate === true).length, advisory.length),
    // OFFLINE curved-part dim accuracy via the STEP radius entity -- the REAL measure for the parts the bbox
    // self-check can only mark "advisory" (cylinders). Closes the spurious curved "0%".
    curvedDimMeasured: measured("curvedDimAccurate").length,
    curvedDimAccurateRate: rate(measured("curvedDimAccurate").filter((r) => r.curvedDimAccurate === true).length, measured("curvedDimAccurate").length),
    anomalies: outliers.map((r) => ({ slug: r.slug, predictedClass: r.predictedClass, nearestSim: r.nearestSim })).slice(0, 50),
  };
}

/**
 * Scan the gen dir -> rows (reads status.json; computes precedentCheck fresh from model.step). `deps` allows
 * injecting {readdirImpl, readFileImpl, existsImpl, precedentFn, indexRows} for tests (fully hermetic).
 */
export function scanGenerations(genDir = GEN_DIR, deps = {}) {
  const { readdirImpl = fs.readdirSync, existsImpl = fs.existsSync, readFileImpl = fs.readFileSync, precedentFn = null, indexRows = null, selfCheckFn = null, curvedDimFn = null } = deps;
  const readJson = (p) => { try { return JSON.parse(readFileImpl(p, "utf8")); } catch { return null; } };
  let dirs = [];
  try { dirs = readdirImpl(genDir, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name); } catch { return []; }
  const rows = [];
  for (const slug of dirs) {
    const dir = path.join(genDir, slug);
    const stepPath = path.join(dir, "model.step");
    const status = readJson(path.join(dir, "status.json")) || {};
    const hasStep = existsImpl(stepPath);
    const row = {
      slug, executed: !!status.executed, hasStep,
      kernelAccurate: status.kernelAccuracy ? status.kernelAccuracy.accurate : undefined,
      // baseline from status.json; may be OVERWRITTEN below by a fresh compute so coverage is comprehensive
      selfCheckAccurate: status.selfCheck ? status.selfCheck.accurate : undefined,
    };
    // Compute the FRESH offline checks from model.step (read ONCE). This covers EVERY gen with a step, not
    // just the sparse subset whose status.json happened to carry an eval -- the comprehensive convergence.
    if (hasStep && (selfCheckFn || precedentFn || curvedDimFn)) {
      let stepText = null;
      try { stepText = readFileImpl(stepPath, "utf8"); } catch { stepText = null; }
      if (stepText) {
        const req = (selfCheckFn || curvedDimFn) ? readJson(path.join(dir, "request.json")) : null;
        const reqStr = req && typeof req.request === "string" ? req.request : null;
        if (selfCheckFn && reqStr) { try { const sc = selfCheckFn(reqStr, stepText); if (sc) { row.selfCheckAccurate = sc.accurate; row.selfCheckReliable = sc.bboxReliable; } } catch { /* keep status.json value */ } }
        // OFFLINE curved-part dim check (radius entity, no kernel) -- measures the diameter the bbox can't
        if (curvedDimFn && reqStr) { try { const cd = curvedDimFn(reqStr, stepText); if (cd && cd.applicable) { row.curvedDimAccurate = cd.accurate; row.curvedDimDeltaPct = cd.deltaPct; } } catch { /* fail-soft */ } }
        if (precedentFn && indexRows && indexRows.length) {
          try { const pc = precedentFn(stepText, indexRows); if (pc && pc.applicable) { row.predictedClass = pc.predictedClass; row.isOutlier = pc.isOutlier; row.nearestSim = pc.nearestSim; } } catch { /* fail-soft */ }
        }
      }
    }
    rows.push(row);
  }
  return rows;
}

// ── CLI ───────────────────────────────────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { loadIndex, precedentCheck, defaultIndexPath } = await import("./cad-geometric-retrieve.mjs");
  // offlineSelfCheck (Fusion-free dim check) computed FRESH over every gen -> comprehensive dim convergence.
  let selfCheckFn = null;
  try { ({ offlineSelfCheck: selfCheckFn } = await import("./cad-text-to-cadquery.mjs")); } catch { selfCheckFn = null; }
  let curvedDimFn = null;
  try { ({ curvedDimCheck: curvedDimFn } = await import("./lib/cad-curved-dim-check.mjs")); } catch { curvedDimFn = null; }
  const indexRows = loadIndex(defaultIndexPath());
  const rows = scanGenerations(GEN_DIR, { precedentFn: precedentCheck, indexRows, selfCheckFn, curvedDimFn });
  const s = summarizeGenerations(rows);
  console.log(`cad-generation quality over ${s.total} staged gens (index: ${indexRows.length} corpus parts):`);
  console.log(`  executed=${s.executed}/${s.total} (${(s.executedRate * 100).toFixed(1)}%)  withStep=${s.withStep}`);
  console.log(`  precedent-evaluated=${s.precedentEvaluated}  byArchetype=${JSON.stringify(s.byPredictedClass)}`);
  console.log(`  geometric OUTLIERS=${s.outlierCount}/${s.precedentEvaluated} (${s.outlierRate === null ? "n/a" : (s.outlierRate * 100).toFixed(1) + "%"})  <- resemble no proven corpus precedent`);
  console.log(`  kernel-dim accuracy=${s.kernelAccurateRate === null ? "n/a (0 measured)" : (s.kernelAccurateRate * 100).toFixed(1) + "%"} over ${s.kernelMeasured} measured`);
  const pct = (r) => (r === null ? "n/a" : (r * 100).toFixed(1) + "%");
  console.log(`  self-check dim accuracy=${pct(s.selfCheckAccurateRate)} over ${s.selfCheckMeasured} measured (aggregate)`);
  console.log(`    EXACT (prismatic, real dim signal)=${pct(s.selfCheckExactAccurateRate)} over ${s.selfCheckExactMeasured}  |  ADVISORY (curved, bbox-limited)=${pct(s.selfCheckAdvisoryAccurateRate)} over ${s.selfCheckAdvisoryMeasured}`);
  console.log(`  curved DIAMETER accuracy (radius entity, offline, no kernel)=${pct(s.curvedDimAccurateRate)} over ${s.curvedDimMeasured} measured  <- the REAL curved dim signal (was spurious 0% via bbox)`);
  if (s.anomalies.length) { console.log(`  ANOMALIES (geometric outliers, first ${Math.min(10, s.anomalies.length)}):`); for (const a of s.anomalies.slice(0, 10)) console.log(`    ${a.slug.slice(0, 46)}  predicted=${a.predictedClass}  nearestSim=${a.nearestSim}`); }
}
