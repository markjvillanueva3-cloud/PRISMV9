#!/usr/bin/env node
/**
 * cad-print-dim-match.mjs (U-DELTA-CAD-PRINT-COMPARE, slot:delta 2026-06-29)
 *
 * NAMING NOTE (R7/dedup): distinct from the 2026-05-24 `scripts/cad-print-compare.mjs` (CAD-PIPELINE-WIRE-MS0,
 * on branch slot/delta) which compares two ISO-2768-mK general-tolerance prints inside its STEP->print->regen
 * pipeline. THIS module is the newer, finer comparator for the operator's 2026-06-29 validation architecture:
 * explicit GD&T bands + MISSING/EXTRA FEATURE detection + OCR-adapter integration. They share a concept
 * (compare two dim sets) but not an API; the integrator should unify them when the branches merge. Renamed
 * from cad-print-compare.mjs to remove the cross-branch name collision.
 *
 * The PURE COMPARISON CORE for the operator's closed-loop CAD validation architecture:
 *   Stage 0 -- 2D-SKETCH self-check (first line): project the generated solid to orthographic views, then
 *              compare that 2D dimension set to the ORIGINAL print.  ("2d sketching as the first line of
 *              self checking your cad drawing to the original print")
 *   Stage 1 -- PRINT-REGEN compare: after the CAD is done, regenerate a drawing/print from it, then compare
 *              the NEW print to the OLD original print.  ("generate a print ... compare the new print to the
 *              old original print to ensure accuracy")
 *
 * Both stages reduce to the SAME primitive: score how well a GENERATED dimension set (a 2D sketch projection,
 * or a regenerated print) matches an ORIGINAL dimension set (the print), tolerance-aware. `cad-gen-accuracy.mjs`
 * grades a single overall bbox triple against requested dims -- this grades a FULL multi-dimension print:
 * per-view dimensions, GD&T tolerance bands, MISSING features (the "2-hole bracket generated 1 hole" gap),
 * and EXTRA features (spurious geometry).  It surfaces feature-count + dimensional defects a bbox check cannot.
 *
 * A "print" here is a structured dimension list (the OCR/projection harness produces it; this module only
 * COMPARES -- pure, no Fusion/network). Each dimension:
 *   { id?, view?, type, nominal, tolPlus?, tolMinus?, plusMinus? }
 *   - type:  "length" | "width" | "height" | "diameter" | "radius" | "hole" | "distance" | "angle" | ...
 *   - view:  "front" | "top" | "right" | "iso" | undefined (view-agnostic, matches any view)
 *   - nominal: the dimensioned value (caller's units; both sides MUST already be in the same units -- the
 *              units-first rail is the harness's job, NOT this scorer's; mixing inch+mm here is a 25.4x error)
 *   - tolPlus/tolMinus: asymmetric band (e.g. 25.0 +0.02 / -0.00); plusMinus: symmetric shorthand.
 *
 * Pure + exported + unit-tested. No Date/random. Never fabricates -- empty/garbage input -> honest empty score.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const DEFAULT_REL_TOL = 0.02; // 2% relative tolerance when a dimension carries no explicit GD&T band

/** Normalize a dimension's tolerance band -> { lo, hi } absolute bounds around nominal. Pure. */
export function toleranceBand(dim, relTol = DEFAULT_REL_TOL) {
  const nominal = Number(dim?.nominal);
  if (!Number.isFinite(nominal)) return null;
  const has = (v) => v != null && Number.isFinite(Number(v));
  let plus, minus;
  if (has(dim.tolPlus) || has(dim.tolMinus)) {
    plus = has(dim.tolPlus) ? Math.abs(Number(dim.tolPlus)) : 0;
    minus = has(dim.tolMinus) ? Math.abs(Number(dim.tolMinus)) : 0;
  } else if (has(dim.plusMinus)) {
    plus = minus = Math.abs(Number(dim.plusMinus));
  } else {
    // no explicit band -> fall back to a relative tolerance around nominal
    const rel = Math.abs(nominal) * relTol;
    plus = minus = rel;
  }
  return { lo: nominal - minus, hi: nominal + plus, banded: has(dim.tolPlus) || has(dim.tolMinus) || has(dim.plusMinus) };
}

/**
 * Grade one generated value against one original (toleranced) dimension.
 * Returns { pass, inBand, relErr, absErr, nominal, actual }. `pass` = inside the GD&T band (if any) OR within
 * relTol when the dim has no band. `relErr` is |actual-nominal|/|nominal| (0 when nominal is 0 and actual is 0). Pure.
 */
export function gradeDimension(actual, dim, relTol = DEFAULT_REL_TOL) {
  const a = Number(actual);
  const nominal = Number(dim?.nominal);
  const band = toleranceBand(dim, relTol);
  if (!Number.isFinite(a) || !band) return { pass: false, inBand: false, relErr: 1, absErr: Infinity, nominal: Number.isFinite(nominal) ? nominal : null, actual: Number.isFinite(a) ? a : null };
  const absErr = Math.abs(a - nominal);
  const relErr = nominal !== 0 ? absErr / Math.abs(nominal) : (a === 0 ? 0 : 1);
  const inBand = a >= band.lo - 1e-9 && a <= band.hi + 1e-9;
  return { pass: inBand, inBand, relErr: Math.round(relErr * 1e4) / 1e4, absErr: Math.round(absErr * 1e6) / 1e6, nominal, actual: a, banded: band.banded };
}

/** Grouping key: a generated dim can only match an original of the same TYPE, and same VIEW when both name one. */
function compatible(orig, gen) {
  if (String(orig.type || "").toLowerCase() !== String(gen.type || "").toLowerCase()) return false;
  const ov = orig.view ? String(orig.view).toLowerCase() : null;
  const gv = gen.view ? String(gen.view).toLowerCase() : null;
  if (ov && gv && ov !== gv) return false; // both name a view and they differ -> incompatible
  return true;
}

/**
 * Greedily match a GENERATED dimension set to an ORIGINAL dimension set. For each original dim (processed in
 * ascending tolerance-tightness so the strictest dims claim their best match first), pick the compatible,
 * still-unused generated dim with the smallest |actual-nominal|. Returns:
 *   { matched:[{ orig, gen, grade }], missing:[orig...], extra:[gen...] }
 * `missing` = original features with no generated counterpart (under-modeled -- e.g. 2 holes, 1 generated).
 * `extra`   = generated dims with no original counterpart (over-modeled -- spurious geometry). Pure.
 */
export function matchDimSets(original, generated, relTol = DEFAULT_REL_TOL) {
  const orig = (Array.isArray(original) ? original : []).filter((d) => d && Number.isFinite(Number(d.nominal)));
  const gen = (Array.isArray(generated) ? generated : []).filter((d) => d && Number.isFinite(Number(d.nominal)));
  const usedGen = new Set();
  const matched = [];
  const missing = [];
  // tightest tolerance first (smallest band width) so a precise feature is not robbed of its match by a loose one
  const bandWidth = (d) => { const b = toleranceBand(d, relTol); return b ? b.hi - b.lo : Infinity; };
  const order = orig.map((d, i) => i).sort((a, b) => bandWidth(orig[a]) - bandWidth(orig[b]));
  for (const oi of order) {
    const od = orig[oi];
    let best = -1, bestErr = Infinity;
    for (let gi = 0; gi < gen.length; gi++) {
      if (usedGen.has(gi)) continue;
      if (!compatible(od, gen[gi])) continue;
      const err = Math.abs(Number(gen[gi].nominal) - Number(od.nominal));
      if (err < bestErr) { bestErr = err; best = gi; }
    }
    if (best >= 0) { usedGen.add(best); matched.push({ orig: od, gen: gen[best], grade: gradeDimension(gen[best].nominal, od, relTol) }); }
    else missing.push(od);
  }
  const extra = gen.filter((_, gi) => !usedGen.has(gi));
  return { matched, missing, extra };
}

/**
 * Score a generated print against the original print. Combines DIMENSIONAL accuracy (matched dims within
 * tolerance), feature COMPLETENESS (no missing original features), and a penalty for EXTRA spurious features.
 * Returns a full report:
 *   { accurate, score, dimAccuracy, completeness, matchedCount, passCount, missingCount, extraCount,
 *     missing:[...], extra:[...], failures:[{type,view,nominal,actual,relErr}...], matched:[...] }
 *   - accurate (boolean): manufacturing-grade match -- every original feature present, every matched dim in
 *     tolerance, no extra features.  (The strict gate Stage 0/Stage 1 use to accept a generated part.)
 *   - score (0..1): graded quality for RANKING (completeness x dimAccuracy, minus an extras penalty) so a
 *     near-miss is ordered above a gross miss even when both are `accurate:false`. Pure.
 */
export function scorePrintMatch(original, generated, { relTol = DEFAULT_REL_TOL, extraPenalty = 0.1 } = {}) {
  const { matched, missing, extra } = matchDimSets(original, generated, relTol);
  const origCount = (Array.isArray(original) ? original : []).filter((d) => d && Number.isFinite(Number(d.nominal))).length;
  const passCount = matched.filter((m) => m.grade.pass).length;
  const dimAccuracy = matched.length ? passCount / matched.length : (origCount === 0 ? 1 : 0);
  const completeness = origCount ? matched.length / origCount : (extra.length ? 0 : 1);
  const extrasPenalty = Math.min(1, extra.length * extraPenalty);
  const score = Math.max(0, Math.round((completeness * dimAccuracy * (1 - extrasPenalty)) * 1e4) / 1e4);
  // `dimAs` is an opaque provenance passthrough (e.g. a circular feature compared as "radius" but dimensioned
  // "diameter" on the print) so the report can be displayed in the operator's original convention.
  const failures = matched.filter((m) => !m.grade.pass).map((m) => ({ type: m.orig.type, dimAs: m.orig.dimAs ?? null, view: m.orig.view ?? null, nominal: m.grade.nominal, actual: m.grade.actual, relErr: m.grade.relErr }));
  return {
    accurate: missing.length === 0 && extra.length === 0 && failures.length === 0 && origCount > 0,
    score,
    dimAccuracy: Math.round(dimAccuracy * 1e4) / 1e4,
    completeness: Math.round(completeness * 1e4) / 1e4,
    matchedCount: matched.length,
    passCount,
    missingCount: missing.length,
    extraCount: extra.length,
    missing: missing.map((d) => ({ type: d.type, dimAs: d.dimAs ?? null, view: d.view ?? null, nominal: Number(d.nominal), id: d.id ?? null })),
    extra: extra.map((d) => ({ type: d.type, dimAs: d.dimAs ?? null, view: d.view ?? null, nominal: Number(d.nominal), id: d.id ?? null })),
    failures,
    matched: matched.map((m) => ({ type: m.orig.type, dimAs: m.orig.dimAs ?? null, view: m.orig.view ?? null, nominal: m.grade.nominal, actual: m.grade.actual, pass: m.grade.pass, relErr: m.grade.relErr, inBand: m.grade.inBand })),
  };
}

/** Load a print dimension set from a JSON file ({ dims:[...] } or a bare [...] array). Throws on unreadable/garbage. */
export function loadPrintDims(filePath) {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const dims = Array.isArray(raw) ? raw : Array.isArray(raw?.dims) ? raw.dims : Array.isArray(raw?.dimensions) ? raw.dimensions : null;
  if (!Array.isArray(dims)) throw new Error(`${filePath}: no dims array (expected [...] or {dims:[...]})`);
  return dims;
}

async function main() {
  const args = process.argv.slice(2);
  const get = (n, d) => { const i = args.indexOf(n); return i >= 0 && i + 1 < args.length ? args[i + 1] : d; };
  const asJson = args.includes("--json");
  const relTol = parseFloat(get("--tol", String(DEFAULT_REL_TOL))) || DEFAULT_REL_TOL;
  const origPath = get("--original", null);
  const genPath = get("--generated", null);
  if (!origPath || !genPath) { process.stderr.write("cad-print-compare: need --original <print.json> --generated <print.json> [--tol 0.02] [--json]\n"); process.exit(2); }
  let original, generated;
  try { original = loadPrintDims(path.resolve(origPath)); generated = loadPrintDims(path.resolve(genPath)); }
  catch (e) { process.stderr.write(`load failed: ${e.message}\n`); process.exit(2); }
  const report = scorePrintMatch(original, generated, { relTol });
  if (asJson) { process.stdout.write(JSON.stringify(report, null, 2) + "\n"); process.exit(report.accurate ? 0 : 1); }
  process.stdout.write(`[CAD-PRINT-COMPARE] ${report.accurate ? "✓ MATCH" : "✗ MISMATCH"}  score ${(100 * report.score).toFixed(0)}%  (dimAcc ${(100 * report.dimAccuracy).toFixed(0)}%, complete ${(100 * report.completeness).toFixed(0)}%)\n`);
  process.stdout.write(`  matched ${report.matchedCount} (${report.passCount} in-tol) · missing ${report.missingCount} · extra ${report.extraCount}\n`);
  const lbl = (d) => (d.dimAs === "diameter" ? "diameter" : d.type) + (d.view ? `/${d.view}` : "");
  const val = (d, v) => (d.dimAs === "diameter" && v != null ? v * 2 : v); // show circular features in their dimensioned convention
  for (const m of report.missing) process.stdout.write(`  MISSING ${lbl(m)} nominal ${val(m, m.nominal)} (original feature not generated)\n`);
  for (const f of report.failures) process.stdout.write(`  OUT-OF-TOL ${lbl(f)} want ${val(f, f.nominal)} got ${val(f, f.actual)} (${(100 * f.relErr).toFixed(1)}%)\n`);
  for (const x of report.extra) process.stdout.write(`  EXTRA ${lbl(x)} nominal ${val(x, x.nominal)} (generated feature with no original)\n`);
  process.exit(report.accurate ? 0 : 1);
}

const isMain = (() => { try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); } catch { return false; } })();
if (isMain) main().catch((e) => { process.stderr.write(`${e?.stack ?? e}\n`); process.exit(1); });
